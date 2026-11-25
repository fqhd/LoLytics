import os, json, requests, math, copy, numpy as np
from flask import jsonify, request
from server.network import send_server_error
from server.utils import find_participant_with_puuid, get_mass_region
from model.game import sync_timers, create_initial_state, update_with_event
from model.dataset import vectorize_state
import joblib


lr_pipe = joblib.load('logreg.joblib')


with open('./server/runes.json', encoding='utf-8') as f:
    rune_data = json.load(f)


def is_strong_event(event):
    if event['type'] == 'ELITE_MONSTER_KILL' and event['killerId'] == 0:
        return False
    return event['type'] in ['CHAMPION_KILL', 'BUILDING_KILL', 'ELITE_MONSTER_KILL']


def predict_prob(state):
    """Return P(blue wins) for a single state using the trained pipeline."""
    v = vectorize_state(state)
    arr = np.asarray(v, dtype=np.float64).reshape(1, -1)
    return float(lr_pipe.predict_proba(arr)[0, 1])


def compute_event_deltas(game):
    """For each strong event, P(after) - P(before)."""
    deltas = []
    dynamic_state = create_initial_state(game)

    for i, event in enumerate(game['events']):
        delta_t = (event['timestamp'] - game['events'][i - 1]['timestamp']
                   if i > 0 else event['timestamp'])

        pre_state = copy.deepcopy(dynamic_state)
        sync_timers(pre_state, delta_t)
        pre_state['time'] = event['timestamp']
        p_before = predict_prob(pre_state)

        update_with_event(dynamic_state, event, delta_t)
        post_state = copy.deepcopy(dynamic_state)
        post_state['time'] = event['timestamp']
        p_after = predict_prob(post_state)

        deltas.append(p_after - p_before)

    return deltas


def get_win_probability_widgets(events, deltas, champions):
    widgets = []
    for i in range(len(events)):
        event = events[i]
        if event['type'] == 'LEVEL_UP':
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


def get_states_per_minute(frames, game):
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

        prob = predict_prob(current_state)

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


def match_analysis():
    id = request.args.get('id')
    puuid = request.args.get('puuid')
    region = request.args.get('region')
    mass = get_mass_region(region)

    cache_key = f'{id}:{puuid}'
    if cache_key in cache:
        return jsonify(cache[cache_key])

    riot_key = os.getenv('RIOT_KEY')

    game_url = f'https://{mass}.api.riotgames.com/lol/match/v5/matches/{id}?api_key={riot_key}'
    timeline_url = f'https://{mass}.api.riotgames.com/lol/match/v5/matches/{id}/timeline?api_key={riot_key}'

    game_resp = requests.get(game_url)
    timeline_resp = requests.get(timeline_url)

    if game_resp.status_code == 404:
        return jsonify({'error': 'Match not found'}), 404
    if game_resp.status_code != 200:
        print('API error:', game_resp.status_code, game_resp.text)
        return send_server_error()
    if timeline_resp.status_code != 200:
        print('API error:', timeline_resp.status_code, timeline_resp.text)
        return send_server_error()

    game_data = game_resp.json()
    timeline_data = timeline_resp.json()

    game = {'champions': [], 'events': [], 'win': None}
    for participant in game_data['info']['participants']:
        game['champions'].append(participant['championName'])
    for frame in timeline_data['info']['frames']:
        for event in frame['events']:
            if is_strong_event(event):
                game['events'].append(event)

    deltas = compute_event_deltas(game)
    states_per_minute, probabilities = get_states_per_minute(
        timeline_data['info']['frames'], game,
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
