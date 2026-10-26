import os, json, requests, math, copy, numpy as np
from flask import jsonify, request
from server.network import send_server_error
from server.utils import find_participant_with_puuid, get_mass_region
from model.game import sync_timers, create_initial_state, update_with_event
from model.dataset import vectorize_state, rank_to_elo
import joblib


# --- Load logistic regression checkpoint ---
# Saved by train.py as a dict: {'model', 'scaler', 'feature_cols', 'n_features'}
# `feature_cols` are the indices into the 172-vector the LR was trained on —
# it excludes the 10 champion indices (0..9) at train time, so we must apply
# the same slice at inference.
_lr_ckpt = joblib.load('logreg.joblib')
lr_model        = _lr_ckpt['model']
lr_scaler       = _lr_ckpt['scaler']
lr_feature_cols = _lr_ckpt['feature_cols']
del _lr_ckpt


with open('./server/runes.json', encoding='utf-8') as f:
    rune_data = json.load(f)


def is_strong_event(event):
    if event['type'] == 'ELITE_MONSTER_KILL' and event['killerId'] == 0:
        return False
    return event['type'] in ['CHAMPION_KILL', 'BUILDING_KILL', 'ELITE_MONSTER_KILL']


# --- LR inference helper ---

def predict_prob(state, elo):
    """Return P(blue wins) for a single state using the trained LR model.

    The full vector is 172 long: [0..9] champions, [10..170] state features,
    [171] elo.  The LR was trained on ``arr[feature_cols]`` (which is the
    last 162 entries — everything except the champion indices), so we apply
    the same slice here.
    """
    v = vectorize_state(state)                 # 171 features
    v.append(elo)                              # 172 — elo is the last column
    arr = np.asarray(v, dtype=np.float64)
    X = arr[lr_feature_cols].reshape(1, -1)    # (1, n_features)
    X_s = lr_scaler.transform(X)
    return float(lr_model.predict_proba(X_s)[0, 1])


def compute_event_deltas(game, elo):
    """For each strong event, P(after) - P(before) using the LR model.

    Unlike the GRU, the LR is stateless — no growing history is needed.
    `pre_state` is the game state at the event timestamp before the event
    is applied; `post_state` is the state at the same timestamp after it
    is applied.  The delta isolates the event's immediate effect.
    """
    deltas = []
    dynamic_state = create_initial_state(game)

    for i, event in enumerate(game['events']):
        delta_t = (event['timestamp'] - game['events'][i - 1]['timestamp']
                   if i > 0 else event['timestamp'])

        # Pre-event snapshot at the event's timestamp
        pre_state = copy.deepcopy(dynamic_state)
        sync_timers(pre_state, delta_t)
        pre_state['time'] = event['timestamp']
        p_before = predict_prob(pre_state, elo)

        # Apply event, snapshot post-event state at same timestamp
        update_with_event(dynamic_state, event, delta_t)
        post_state = copy.deepcopy(dynamic_state)
        post_state['time'] = event['timestamp']
        p_after = predict_prob(post_state, elo)

        deltas.append(p_after - p_before)

    return deltas


# --- Widgets ---

def get_win_probability_widgets(events, deltas, champions):
    widgets = []
    for i in range(len(events)):
        event = events[i]
        if event['type'] == 'LEVEL_UP':  # no-op now, kept for safety
            continue
        killer_icon = None
        victim_icon = None
        assist_icons = []

        if event['killerId'] == 0:
            killer_icon = '/images/icons/minion.png'
        else:
            champion = champions[event['killerId'] - 1]
            killer_icon = f'/images/icons/{champion}.jpg'
        if event['type'] == 'CHAMPION_KILL':
            victim_champion = champions[event['victimId'] - 1]
            victim_icon = f'/images/icons/{victim_champion}.jpg'
        elif event['type'] == 'ELITE_MONSTER_KILL':
            if event['monsterType'] == 'DRAGON' and event['monsterSubType'] == 'ELDER_DRAGON':
                victim_icon = '/images/icons/elder.png'
            else:
                victim_icon = f"/images/icons/{event['monsterType'].lower()}.png"
        elif event['type'] == 'BUILDING_KILL':
            victim_icon = '/images/icons/'
            if event['teamId'] == 100:
                victim_icon += 'blue_'
            else:
                victim_icon += 'red_'
            if event['buildingType'] == 'TOWER_BUILDING':
                victim_icon += 'tower.png'
            else:
                victim_icon += 'inhibitor.png'

        if event.get('assistingParticipantIds'):
            for pid in event['assistingParticipantIds']:
                champion = champions[pid - 1]
                assist_icons.append(f'/images/icons/{champion}.jpg')

        delta = deltas[i] if i < len(deltas) else 0.0

        widgets.append({
            'left': killer_icon,
            'right': victim_icon,
            'delta': round(delta * 100, 2),
            'assists': assist_icons,
            'time': event['timestamp'],
        })
    return widgets


def find_rune_with_id(id):
    if id == 5001:
        return '/images/stats/statmodshealthplusicon.png'
    elif id == 5008:
        return '/images/stats/statmodsadaptiveforceicon.png'
    elif id == 5005:
        return '/images/stats/statmodsattackspeedicon.png'
    elif id == 5007:
        return '/images/stats/statmodscdrscalingicon.png'
    elif id == 5011:
        return '/images/stats/statmodshealthscalingicon.png'
    elif id == 5013:
        return '/images/stats/statmodstenacityicon.png'
    elif id == 5010:
        return '/images/stats/statmodsmovementspeedicon.png'

    for branch in rune_data:
        for slot in branch['slots']:
            for rune in slot['runes']:
                if id == rune['id']:
                    return rune['icon']
    return None


def get_states_per_minute(frames, game, elo):
    """Per-minute UI states and P(blue wins) using the LR model.

    The LR is stateless, so the probability at each frame depends only on
    the current state — no per-frame sequence history needs to be tracked.
    """
    client_states = []
    probabilities = []

    dynamic_state = create_initial_state(game)

    i = 0
    for frame in frames:
        while i < len(game['events']) and game['events'][i]['timestamp'] < frame['timestamp']:
            event = game['events'][i]
            delta = (event['timestamp'] - game['events'][i - 1]['timestamp']
                     if i > 0 else event['timestamp'])
            update_with_event(dynamic_state, event, delta)
            i += 1

        current_state = copy.deepcopy(dynamic_state)
        last_event_t = game['events'][i - 1]['timestamp'] if i > 0 else 0
        sync_timers(current_state, max(frame['timestamp'] - last_event_t, 0))
        current_state['time'] = frame['timestamp']

        prob = predict_prob(current_state, elo)

        # UI state (unchanged)
        state = {
            'teams': [
                {'players': [], 'towers': []},
                {'players': [], 'towers': []},
            ]
        }

        for k in ['1', '2', '3', '4', '5']:
            player = frame['participantFrames'][k]
            x = player['position']['x']
            y = player['position']['y']
            champion_name = game['champions'][int(k) - 1]
            state['teams'][0]['towers'] = copy.deepcopy(current_state['teams'][0]['towers'])
            state['teams'][0]['inhibs'] = copy.deepcopy(current_state['teams'][0]['inhibs'])
            state['teams'][0]['players'].append({
                'x': x,
                'y': y,
                'kills': current_state['teams'][0]['players'][int(k) - 1]['kills'],
                'deaths': current_state['teams'][0]['players'][int(k) - 1]['deaths'],
                'assists': current_state['teams'][0]['players'][int(k) - 1]['assists'],
                'deathTimer': current_state['teams'][0]['players'][int(k) - 6]['death_timer'] / 1_000,
                'creepscore': player['jungleMinionsKilled'] + player['minionsKilled'],
                'champion': champion_name,
            })

        for k in ['6', '7', '8', '9', '10']:
            player = frame['participantFrames'][k]
            x = player['position']['x']
            y = player['position']['y']
            champion_name = game['champions'][int(k) - 1]
            state['teams'][1]['towers'] = copy.deepcopy(current_state['teams'][1]['towers'])
            state['teams'][1]['inhibs'] = copy.deepcopy(current_state['teams'][1]['inhibs'])
            state['teams'][1]['players'].append({
                'x': x,
                'y': y,
                'kills': current_state['teams'][1]['players'][int(k) - 6]['kills'],
                'deaths': current_state['teams'][1]['players'][int(k) - 6]['deaths'],
                'assists': current_state['teams'][1]['players'][int(k) - 6]['assists'],
                'deathTimer': current_state['teams'][1]['players'][int(k) - 6]['death_timer'] / 1_000,
                'creepscore': player['jungleMinionsKilled'] + player['minionsKilled'],
                'champion': champion_name,
            })

        client_states.append(state)
        probabilities.append(prob)

    return client_states, probabilities


def get_participant_item_purchases(frames, participant_id):
    grouped = {}
    for frame in frames:
        for event in frame['events']:
            if event.get('participantId') != participant_id:
                continue
            if event['type'] == 'ITEM_PURCHASED':
                minute = math.floor(event['timestamp'] / 1000 / 60)
                grouped.setdefault(minute, {})
                grouped[minute][event['itemId']] = grouped[minute].get(event['itemId'], 0) + 1
            if event['type'] == 'ITEM_UNDO' and event['beforeId'] != 0:
                minute = math.floor(event['timestamp'] / 1000 / 60)
                for m in range(minute, -1, -1):
                    if m in grouped and event['beforeId'] in grouped[m]:
                        grouped[m][event['beforeId']] -= 1
                        if grouped[m][event['beforeId']] <= 0:
                            del grouped[m][event['beforeId']]
                        if not grouped[m]:
                            del grouped[m]
                        break

    result = [
        {
            'time': int(time),
            'items': [{'id': int(item_id), 'count': count}
                      for item_id, count in items.items()],
        }
        for time, items in grouped.items()
        if items
    ]
    result.sort(key=lambda x: x['time'])
    return result


cache = {}


def get_player_rank(resp, queueType):
    for ranks in resp:
        if ranks['queueType'] == queueType:
            return ranks['tier']
    return 'GOLD'


def match_analysis():
    id = request.args.get('id')
    puuid = request.args.get('puuid')
    region = request.args.get('region')
    mass = get_mass_region(region)
    queue = request.args.get('queue')

    queueType = {
        'soloq': 'RANKED_SOLO_5x5',
        'flex': 'RANKED_FLEX_SR',
    }.get(queue)

    cache_key = f'{id}:{puuid}'
    if cache_key in cache:
        return jsonify(cache[cache_key])

    riot_key = os.getenv('RIOT_KEY')

    game_url = f'https://{mass}.api.riotgames.com/lol/match/v5/matches/{id}?api_key={riot_key}'
    timeline_url = f'https://{mass}.api.riotgames.com/lol/match/v5/matches/{id}/timeline?api_key={riot_key}'
    league_url = f'https://{region}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}?api_key={riot_key}'

    game_resp = requests.get(game_url)
    timeline_resp = requests.get(timeline_url)
    league_resp = requests.get(league_url)

    if game_resp.status_code == 404:
        return jsonify({'error': 'Match not found'}), 404
    if game_resp.status_code != 200:
        print('API error:', game_resp.status_code, game_resp.text)
        return send_server_error()
    if timeline_resp.status_code != 200:
        print('API error:', timeline_resp.status_code, timeline_resp.text)
        return send_server_error()
    if league_resp.status_code != 200:
        print('API error:', league_resp.status_code, league_resp.text)
        return send_server_error()

    game_data = game_resp.json()
    timeline_data = timeline_resp.json()
    league_resp = league_resp.json()

    rank = get_player_rank(league_resp, queueType)
    elo = rank_to_elo(rank)

    game = {'champions': [], 'events': [], 'win': None}
    for participant in game_data['info']['participants']:
        game['champions'].append(participant['championName'])
    for frame in timeline_data['info']['frames']:
        for event in frame['events']:
            if is_strong_event(event):
                game['events'].append(event)

    deltas = compute_event_deltas(game, elo)
    states_per_minute, probabilities = get_states_per_minute(
        timeline_data['info']['frames'], game, elo,
    )
    widgets = get_win_probability_widgets(game['events'], deltas, game['champions'])

    events = {}
    for widget in widgets:
        minute = int(widget['time'] / 60_000) + 1
        events.setdefault(str(minute), []).append(widget)

    player = find_participant_with_puuid(game_data['info']['participants'], puuid)

    runes = {
        'primaryTree': {
            'keystone': find_rune_with_id(player['perks']['styles'][0]['selections'][0]['perk']),
            'subs': [
                find_rune_with_id(player['perks']['styles'][0]['selections'][1]['perk']),
                find_rune_with_id(player['perks']['styles'][0]['selections'][2]['perk']),
                find_rune_with_id(player['perks']['styles'][0]['selections'][3]['perk']),
            ],
        },
        'secondaryTree': {
            'subs': [
                find_rune_with_id(player['perks']['styles'][1]['selections'][0]['perk']),
                find_rune_with_id(player['perks']['styles'][1]['selections'][1]['perk']),
            ],
        },
        'statPerks': [
            find_rune_with_id(player['perks']['statPerks']['offense']),
            find_rune_with_id(player['perks']['statPerks']['flex']),
            find_rune_with_id(player['perks']['statPerks']['defense']),
        ],
    }

    items = get_participant_item_purchases(
        timeline_data['info']['frames'], player['participantId'],
    )

    response_data = {
        'probabilities': probabilities,
        'runes': runes,
        'items': items,
        'frames': states_per_minute,
        'events': events,
    }
    cache[cache_key] = response_data
    return jsonify(response_data)