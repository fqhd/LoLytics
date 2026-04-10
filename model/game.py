import math, copy

def create_players():
    players = []
    for _ in range(5):
        players.append({
            'kill_gold': 0,
            'kills': 0,
            'deaths': 0,
            'assists': 0,
            'baron_timer': 0,
            'elder_timer': 0,
            'death_timer': 0,
            'level': 1
        })
    return players

def create_team():
    return {
        'players': create_players(),
        'drakes': [],
        'rifts': 0,
        'grubs': 0,
        'towers': [
            1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0
        ],
        'inhibs': [0, 0, 0]
    }

def create_initial_state(game):
    return {
        'champions': game['champions'],
        'teams': [create_team(), create_team()],
        'win': game['win'],
        'time': 0
    }

def calculate_tif(time):
    if time >= 0 and time < 15:
        return 0
    elif time >= 15 and time < 30:
        return math.ceil(2 * (time - 15)) * 0.425
    elif time >= 30 and time < 45:
        return 12.75 + math.ceil(2 * (time - 30)) * 0.3
    elif time >= 45 and time < 55:
        return 21.75 + math.ceil(2 * (time - 45)) * 1.45
    else:
        return 50

def calculate_death_timer(level, time):
    BRW = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5]
    current_brw = BRW[level - 1]
    current_tif = calculate_tif(time / 60000) / 100
    return current_brw + current_brw * current_tif

def process_champion_kill(state, event):
    team_id = int((event['killerId'] - 1) / 5)
    if event['killerId'] > 0:
        player_id = (event['killerId'] - 1) % 5
        state['teams'][team_id]['players'][player_id]['kill_gold'] += event['bounty'] + event['shutdownBounty']
        state['teams'][team_id]['players'][player_id]['kills'] += 1
    victim_team_id = int((event['victimId'] - 1) / 5)
    victim_id = (event['victimId'] - 1) % 5
    victim = state['teams'][victim_team_id]['players'][victim_id]

    if 'assistingParticipantIds' in event:
        for participant_id in event['assistingParticipantIds']:
            state['teams'][int((participant_id - 1) / 5)]['players'][(participant_id - 1) % 5]['assists'] += 1

    victim['deaths'] += 1
    victim['baron_timer'] = 0
    victim['elder_timer'] = 0
    victim['death_timer'] = round(calculate_death_timer(min(victim['level'], 18), event['timestamp']) * 1000)

def get_tower_id(state, event):
    tower_id = 0
    team_id = int(event['teamId'] / 100) - 1
    if event['laneType'] == 'BOT_LANE':
        tower_id = 6
    elif event['laneType'] == 'MID_LANE':
        tower_id = 3

    if event['towerType'] == 'INNER_TURRET':
        tower_id += 1
    elif event['towerType'] == 'BASE_TURRET':
        tower_id += 2
    elif event['towerType'] == 'NEXUS_TURRET':
        t1 = state['teams'][team_id]['towers'][9]
        if t1 > 0:
            tower_id = 10
        else:
            tower_id = 9
    return tower_id

def process_tower_kill(state, event):
    tower_id = get_tower_id(state, event)
    team_id = int(event['teamId'] / 100) - 1
    if tower_id == 9 or tower_id == 10:
        state['teams'][team_id]['towers'][tower_id] = 180000
    else:
        state['teams'][team_id]['towers'][tower_id] = 0

def process_inhibitor_kill(state, event):
    lane = 0
    if event['laneType'] == 'MID_LANE':
        lane = 1
    if event['laneType'] == 'BOT_LANE':
        lane = 2

    team_id = int(event['teamId'] / 100) - 1
    state['teams'][team_id]['inhibs'][lane] = 300000

def process_building_kill(state, event):
    if event['buildingType'] == 'TOWER_BUILDING':
        process_tower_kill(state, event)
    if event['buildingType'] == 'INHIBITOR_BUILDING':
        process_inhibitor_kill(state, event)

def process_monster_kill(state, event):
    if event['killerId'] == 0:
        return

    team_id = int((event['killerId'] - 1) / 5)

    if (event['monsterType'] == 'DRAGON'):
        if (event['monsterSubType'] == 'ELDER_DRAGON'):
            for player in state['teams'][team_id]['players']:
                if player['death_timer'] == 0:
                    player['elder_timer'] = 150000
        else:
            state['teams'][team_id]['drakes'].append(event['monsterSubType'])
    elif (event['monsterType'] == 'RIFTHERALD'):
        state['teams'][team_id]['rifts'] += 1
    elif (event['monsterType'] == 'HORDE'):
        state['teams'][team_id]['grubs'] += 1
    elif (event['monsterType'] == 'BARON_NASHOR'):
        for player in state['teams'][team_id]['players']:
            if player['death_timer'] == 0:
                player['baron_timer'] = 180000

def process_levelup(state, event):
    team_id = int((event['participantId'] - 1) / 5)
    player_id = (event['participantId'] - 1) % 5
    state['teams'][team_id]['players'][player_id]['level'] += 1

def update_with_event(state, event, delta_time):
    sync_timers(state, delta_time)
    if event['type'] == 'CHAMPION_KILL':
        process_champion_kill(state, event)
    if event['type'] == 'BUILDING_KILL':
        process_building_kill(state, event)
    if event['type'] == 'ELITE_MONSTER_KILL':
        process_monster_kill(state, event)
    if (event['type'] == 'LEVEL_UP'):
        process_levelup(state, event)

def sync_timers(state, delta_time):
    for team in state['teams']:
        for player in team['players']:
            player['baron_timer'] = max(player['baron_timer'] - delta_time, 0)
            player['elder_timer'] = max(player['elder_timer'] - delta_time, 0)
            player['death_timer'] = max(player['death_timer'] - delta_time, 0)
        team['towers'][9] = max(team['towers'][9] - delta_time, 0)
        team['towers'][10] = max(team['towers'][10] - delta_time, 0)

        for i in range(3):
            team['inhibs'][i] = max(team['inhibs'][i] - delta_time, 0)

def sample(game, index):
    state = create_initial_state(game)

    for i in range(index):
        delta = game['events'][i]['timestamp'] - game['events'][i - 1]['timestamp'] if i > 0 else game['events'][i]['timestamp']
        update_with_event(state, game['events'][i], delta)

    sync_timers(state, game['events'][-1]['timestamp'] - game['events'][-2]['timestamp'])
    state['time'] = game['events'][index]['timestamp']
    return state

def sample_until(game, callback):
    state = create_initial_state(game)

    for i, event in enumerate(game['events']):
        event_outcome = callback(state, event)
        delta = game['events'][i]['timestamp'] - game['events'][i - 1]['timestamp'] if i > 0 else game['events'][i]['timestamp']
        if event_outcome[0]:
            sync_timers(state, delta)
            state['time'] = event['timestamp']
            return state, event_outcome[1]
        update_with_event(state, event, delta)

    return False, None

def sample_every(game, callback):
    state = create_initial_state(game)
    delta = 0
    state_samples = []

    for i, event in enumerate(game['events']):
        event_outcome = callback(state, event)
        delta = game['events'][i]['timestamp'] - game['events'][i - 1]['timestamp'] if i > 0 else game['events'][i]['timestamp']
        if event_outcome[0]:
            state_copy = copy.deepcopy(state)
            sync_timers(state_copy, delta)
            state_copy['time'] = event['timestamp']
            state_samples.append((state_copy, event_outcome[1]))
        update_with_event(state, event, delta)

    return state_samples

def sample_all(game):
    state = create_initial_state(game)
    states = []

    states.append(copy.deepcopy(state))

    delta = 0
    for i in range(len(game['events'])):
        prev_event = game['events'][i - 1] if i > 0 else game['events'][i]
        event = game['events'][i]
        delta = event['timestamp'] - prev_event['timestamp']
        update_with_event(state, event, delta)
        state['time'] = event['timestamp']
        states.append(copy.deepcopy(state))

    return states
