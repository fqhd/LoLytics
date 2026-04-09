from model.game import *
import math

def test_create_players():
    players = create_players()
    for p in players:
        assert p['kill_gold'] == 0
        assert p['kills'] == 0
        assert p['deaths'] == 0
        assert p['assists'] == 0
        assert p['baron_timer'] == 0
        assert p['elder_timer'] == 0
        assert p['death_timer'] == 0
        assert p['level'] == 1

def test_create_team():
    team = create_team()
    assert len(team['players']) == 5
    assert len(team['drakes']) == 0
    assert team['rifts'] == 0
    assert team['grubs'] == 0
    assert len(team['towers']) == 11
    assert len(team['inhibs']) == 3

def test_calculate_death_timer():
    for (level, time, death_timer) in [(7, 9*60000+18000, 20), (17, 33*60000+8000, 58), (10, 16*60000+3000, 33)]:
        predicted_death_timer = calculate_death_timer(level, time)
        predicted_death_timer = math.ceil(predicted_death_timer)
        assert death_timer == predicted_death_timer

def test_process_champion_kill_A():
    state = {
        'teams': [
            {
                'players': [
                    {
                        'assists': 0,
                    }, None, None, {
                        'kill_gold': 400,
                        'kills': 2,
                        'deaths': 0,
                        'assists': 1,
                        'baron_timer': 0,
                        'elder_timer': 0,
                        'death_timer': 0,
                        'level': 1
                    }, None
                ]
            },
            {
                'players': [
                    {
                        'kill_gold': 0,
                        'kills': 0,
                        'deaths': 2,
                        'assists': 0,
                        'baron_timer': 579814,
                        'elder_timer': 498743,
                        'death_timer': 0,
                        'level': 1
                    }, None, None, None, None
                ]
            }
        ]
    }

    event = {
        'type': 'CHAMPION_KILL',
        'killerId': 4,
        'victimId': 6,
        'bounty': 245,
        'shutdownBounty': 700,
        'assistingParticipantIds': [
            1
        ],
        'timestamp': 438039
    }

    process_champion_kill(state, event)

    # Check killer updates
    assert state['teams'][0]['players'][3]['kills'] == 3
    assert state['teams'][0]['players'][3]['kill_gold'] == 1345

    # Check assists
    assert state['teams'][0]['players'][0]['assists'] == 1

    # Check victim updates
    assert state['teams'][1]['players'][0]['baron_timer'] == 0
    assert state['teams'][1]['players'][0]['deaths'] == 3
    assert state['teams'][1]['players'][0]['elder_timer'] == 0
    assert state['teams'][1]['players'][0]['death_timer'] > 0

def test_process_tower_kill():
    state = {
        'teams': [
            {
                'towers': [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
            }, {
                'towers': [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
            }
        ]
    }

    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'INNER_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][4] == 0

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'OUTER_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][3] == 0

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'TOP_LANE',
        'towerType': 'OUTER_TURRET',
        'teamId': 200
    })
    assert state['teams'][1]['towers'][0] == 0

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'NEXUS_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][9] == 180000

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'NEXUS_TURRET',
        'teamId': 100
    })
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'NEXUS_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][9] == 180000 and state['teams'][0]['towers'][10] == 180000

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 180000, 0]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'NEXUS_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][10] == 180000

    state['teams'][0]['towers'] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 180000]
    process_tower_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'TOWER_BUILDING',
        'laneType': 'MID_LANE',
        'towerType': 'NEXUS_TURRET',
        'teamId': 100
    })
    assert state['teams'][0]['towers'][10] == 180000

def test_process_inhibitor_kill():
    state = {
        'teams': [
            {
                'inhibs': [0, 0, 0]
            }, {
                'inhibs': [0, 0, 0]
            }
        ]
    }

    process_inhibitor_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'INHIBITOR_BUILDING',
        'laneType': 'MID_LANE',
        'teamId': 100
    })
    assert state['teams'][0]['inhibs'][1] == 300000

    state['teams'][0]['inhibs'] = [0, 0, 0]
    process_inhibitor_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'INHIBITOR_BUILDING',
        'laneType': 'TOP_LANE',
        'teamId': 200
    })
    assert state['teams'][1]['inhibs'][0] == 300000

    state['teams'][0]['inhibs'] = [0, 0, 0]
    process_inhibitor_kill(state, {
        'type': 'BUILDING_KILL',
        'buildingType': 'INHIBITOR_BUILDING',
        'laneType': 'BOT_LANE',
        'teamId': 200
    })
    assert state['teams'][1]['inhibs'][2] == 300000

def test_process_champion_kill_B():
    state = {
        'teams': [{
            'players': [{
                'kill_gold': 11,
                'kills': 2,
                'deaths': 3,
                'death_timer': 0,
                'elder_timer': 0,
                'baron_timer': 40000,
                'level': 10,
            }, None, None, {'assists': 4}, None]
        }, {
            'players': [{
                'kill_gold': 200,
                'kills': 4,
                'deaths': 5,
                'elder_timer': 2304,
                'baron_timer': 24984,
                'death_timer': 0,
                'level': 9,
            }, None, None, None, None]
        }]
    }

    process_champion_kill(state, {
        'type': 'CHAMPION_KILL',
        'killerId': 1,
        'victimId': 6,
        'bounty': 300,
        'shutdownBounty': 100,
        'assistingParticipantIds': [
            4
        ],
        'timestamp': 1000000
    })
    assert state['teams'][0]['players'][0]['kills'] == 3
    assert state['teams'][0]['players'][0]['kill_gold'] == 411
    assert state['teams'][0]['players'][3]['assists'] == 5
    assert state['teams'][1]['players'][0]['deaths'] == 6
    assert state['teams'][1]['players'][0]['death_timer'] > 0
    assert state['teams'][1]['players'][0]['baron_timer'] == 0
    assert state['teams'][1]['players'][0]['elder_timer'] == 0

    process_champion_kill(state, {
        'type': 'CHAMPION_KILL',
        'killerId': 6,
        'victimId': 1,
        'bounty': 245,
        'shutdownBounty': 0,
        'timestamp': 1000000
    })
    assert state['teams'][0]['players'][0]['deaths'] == 4
    assert state['teams'][0]['players'][0]['elder_timer'] == 0
    assert state['teams'][0]['players'][0]['baron_timer'] == 0
    assert state['teams'][0]['players'][0]['death_timer'] > 0
    assert state['teams'][1]['players'][0]['kills'] == 5
    assert state['teams'][1]['players'][0]['kill_gold'] == 445

def test_process_monster_kill():
    state = {
        'teams': [
            {
                'players': [
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 9837 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                ],
                'drakes': [],
                'rifts': 0,
                'grubs': 0,
            }, {
                'players': [
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 0 },
                    { 'baron_timer': 0, 'elder_timer': 0, 'death_timer': 38473 },
                ],
                'drakes': [],
                'rifts': 0,
                'grubs': 0,
            }
        ]
    }

    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'DRAGON',
        'monsterSubType': 'FIRE_DRAGON',
        'killerId': 2
    })
    assert state['teams'][0]['drakes'][0] == 'FIRE_DRAGON'
    assert len(state['teams'][0]['drakes']) == 1

    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'HORDE',
        'killerId': 5
    })
    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'HORDE',
        'killerId': 5
    })
    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'HORDE',
        'killerId': 6
    })
    assert state['teams'][0]['grubs'] == 2
    assert state['teams'][1]['grubs'] == 1

    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'RIFTHERALD',
        'killerId': 0,
    })
    assert state['teams'][0]['rifts'] == 0
    assert state['teams'][1]['rifts'] == 0

    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'RIFTHERALD',
        'killerId': 10,
    })
    assert state['teams'][1]['rifts'] == 1

    process_monster_kill(state, {
        'type': 'ELITE_MONSTER_KILL',
        'monsterType': 'BARON_NASHOR',
        'killerId': 10
    })
    for player in state['teams'][1]['players']:
        if player['death_timer'] == 0:
            assert player['baron_timer'] == 180000

    for player in state['teams'][0]['players']:
        assert player['baron_timer'] == 0

    process_monster_kill(state, {
        'TYPE': 'ELITE_MONSTER_KILL',
        'monsterType': 'DRAGON',
        'monsterSubType': 'ELDER_DRAGON',
        'killerId': 5,
    })
    for player in state['teams'][0]['players']:
        if player['death_timer'] == 0:
            assert player['elder_timer'] == 150000

    for player in state['teams'][1]['players']:
        assert player['elder_timer'] == 0

def test_process_levelup():
    state = {
        'teams': [
            {
                'players': [
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                ]
            }, {
                'players': [
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                    { 'level': 1 },
                ]
            }
        ]
    }

    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 1
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 1
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 1
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 2
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 7
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 5
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 5
    })
    process_levelup(state, {
        'type': 'LEVEL_UP',
        'participantId': 10
    })
    assert state['teams'][0]['players'][0]['level'] == 4
    assert state['teams'][0]['players'][1]['level'] == 2
    assert state['teams'][0]['players'][4]['level'] == 3
    assert state['teams'][1]['players'][1]['level'] == 2
    assert state['teams'][1]['players'][4]['level'] == 2
