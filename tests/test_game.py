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

def test_process_champion_kill():
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
