import csv
import json
import threading

import torch
from flask import jsonify, request

from model.network import DraftTransformer


CKPT_PATH = 'draft_transformer.pt'          # matches what you saved
CHAMPION_MAP_PATH = 'champion_to_index.json'
MATCHUP_CSV_PATH = 'matchup_strengths.csv'

# Must match the value the model was TRAINED with. MultiheadAttention weight
# shapes do not depend on nhead, so a mismatch loads cleanly and produces
# wrong-but-plausible predictions. If you save the config dict in the
# checkpoint (see the note below), this is read from there instead.
NHEAD = 4

with open(CHAMPION_MAP_PATH) as f:
    champion_to_index = json.load(f)


def _load_matchup_matrix(path):
    """Load the matchup strength CSV into matrix[attacker][defender] floats."""
    matrix = {}
    with open(path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        columns = header[1:]  # first cell is the row-label column
        for row in reader:
            if not row:
                continue
            name = row[0]
            if not name:
                continue
            matrix[name] = {}
            for col_name, val in zip(columns, row[1:]):
                if not val:
                    continue
                try:
                    matrix[name][col_name] = float(val)
                except ValueError:
                    continue
    return matrix


try:
    matchup_matrix = _load_matchup_matrix(MATCHUP_CSV_PATH)
    print(f'Matchup matrix loaded: {len(matchup_matrix)} rows')
except FileNotFoundError:
    print(f'WARNING: {MATCHUP_CSV_PATH} not found — matchup data unavailable.')
    matchup_matrix = {}


def _matchup(a, b):
    """Strength of champion `a` into champion `b` (×100), or None if unavailable."""
    if not a or not b:
        return None
    row = matchup_matrix.get(a)
    if row is None:
        key_a = next((k for k in matchup_matrix if k.lower() == a.lower()), None)
        if key_a is None:
            return None
        row = matchup_matrix[key_a]
    if b in row:
        return row[b] * 100.0
    key_b = next((k for k in row if k.lower() == b.lower()), None)
    return row.get(key_b) * 100.0 if key_b is not None else None


device = 'cuda' if torch.cuda.is_available() else 'cpu'

_lock = threading.Lock()
_model = None


def _load_model():
    """Load and cache the draft transformer, inferring architecture from shapes."""
    global _model
    if _model is not None:
        return _model

    with _lock:
        if _model is not None:
            return _model

        state = torch.load(CKPT_PATH, map_location=device)

        # Support both plain state_dict and {'model': sd, 'config': {...}}
        if isinstance(state, dict) and 'model' in state:
            sd = state['model']
            cfg = state.get('config', {})
        else:
            sd = state
            cfg = {}

        num_champs = sd['champ_emb.weight'].shape[0]
        d_model    = sd['champ_emb.weight'].shape[1]
        dim_ff     = sd['blocks.0.ff.0.weight'].shape[0]
        num_layers = sum(
            1 for k in sd
            if k.startswith('blocks.') and k.endswith('.self_attn.in_proj_weight')
        )
        nhead = cfg.get('nhead', NHEAD)

        if len(champion_to_index) != num_champs:
            raise RuntimeError(
                f'champion_to_index.json has {len(champion_to_index)} entries '
                f'but the model embedding has {num_champs}. '
                f'These must match exactly — the JSON was probably regenerated '
                f'after the model was trained, or a champion (e.g. Locke) was '
                f'added to the JSON without retraining the model.'
            )

        model = DraftTransformer(
            num_champs=num_champs,
            d_model=d_model,
            nhead=nhead,
            num_layers=num_layers,
            dim_ff=dim_ff,
            dropout=0.0,
        )
        model.load_state_dict(sd)
        model.to(device).eval()

        print(
            f'DraftTransformer loaded: num_champs={num_champs}, '
            f'd_model={d_model}, nhead={nhead}, '
            f'num_layers={num_layers}, dim_ff={dim_ff}, device={device}'
        )

        _model = model
        return _model


def _parse_team(raw, label):
    if not raw:
        return None, f'Missing `{label}` query parameter.'
    names = [n.strip() for n in raw.split(',')]
    if len(names) != 5:
        return None, f'`{label}` must contain exactly 5 champions, got {len(names)}.'
    if any(not n for n in names):
        return None, f'`{label}` contains an empty champion name.'
    return names, None


def _to_indices(names, label):
    ids = []
    for name in names:
        if name in champion_to_index:
            ids.append(champion_to_index[name])
            continue
        match = next(
            (k for k in champion_to_index if k.lower() == name.lower()),
            None,
        )
        if match is None:
            return None, f'Unknown champion in `{label}`: {name!r}'
        ids.append(champion_to_index[match])
    return ids, None


def draft():
    blue_raw = request.args.get('blue', type=str)
    red_raw  = request.args.get('red', type=str)

    blue_names, err = _parse_team(blue_raw, 'blue')
    if err:
        return jsonify({'error': err}), 400
    red_names, err = _parse_team(red_raw, 'red')
    if err:
        return jsonify({'error': err}), 400

    all_names = blue_names + red_names
    if len({n.lower() for n in all_names}) != len(all_names):
        seen, dup = set(), None
        for n in all_names:
            if n.lower() in seen:
                dup = n
                break
            seen.add(n.lower())
        return jsonify({'error': f'Duplicate champion: {dup}'}), 400

    blue_ids, err = _to_indices(blue_names, 'blue')
    if err:
        return jsonify({'error': err}), 400
    red_ids, err = _to_indices(red_names, 'red')
    if err:
        return jsonify({'error': err}), 400

    try:
        model = _load_model()
    except Exception as e:
        return jsonify({'error': f'Model unavailable: {e}'}), 500

    champ_ids = torch.tensor(
        [blue_ids + red_ids], dtype=torch.long, device=device,
    )

    with torch.inference_mode():
        logits = model(champ_ids)
        probs  = torch.softmax(logits, dim=-1)
        blue_win_prob = probs[0, 0].item()

    # Matchup strengths, keyed by role index.
    #   blue_into_red[i][j] = matrix[blue[i]][red[j]]  (blue i's strength into red j)
    #   red_into_blue[j][i] = matrix[red[j]][blue[i]]  (red j's strength into blue i)
    blue_into_red = [
        [_matchup(blue_names[i], red_names[j]) for j in range(5)]
        for i in range(5)
    ]
    red_into_blue = [
        [_matchup(red_names[j], blue_names[i]) for i in range(5)]
        for j in range(5)
    ]

    return jsonify({
        'blue_win_prob': float(blue_win_prob),
        'matchups': {
            'blue_into_red': blue_into_red,
            'red_into_blue': red_into_blue,
        },
    })