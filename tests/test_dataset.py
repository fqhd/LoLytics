from model.dataset import vectorize_state

def test_vectorize_state():
    state = {
        'champions': ['Annie', 'Riven', 'Aatrox', 'Leona', 'Jinx', 'Aphelios', 'Zaahen', 'Khazix', 'Ahri', 'Anivia']
        'teams': [
            {
                'players': [
                    {
                        'kill_gold', 740,
                        'kills': 8,
                        'deaths': 3,
                        'assists': 4,
                        'baron_timer': 84924,
                        'elder_timer': 4982,
                        'level': 5
                    },
                    {
                        'kill_gold', 545,
                        'kills': 9,
                        'deaths': 14,
                        'assists': 20,
                        'baron_timer': 47194,
                        'elder_timer': 1649,
                        'level': 8
                    },
                    {
                        'kill_gold', 12159,
                        'kills': 6,
                        'deaths': 5,
                        'assists': 31,
                        'baron_timer': 4658,
                        'elder_timer': 71654,
                        'level': 17
                    },
                    {
                        'kill_gold', 56598,
                        'kills': 12,
                        'deaths': 8,
                        'assists': 9,
                        'baron_timer': 13265,
                        'elder_timer': 84569,
                        'level': 11
                    }
                ],
                'drakes': ['HEXTECH_DRAGON', 'FIRE_DRAGON'],
                'rifts': 0,
                'grubs': 2,
                'towers': [1, 1, 1, 1, 1, 1, 1, 1, 1, 492, 48958],
                'inhibs': [0, 3274, 23983]
            },
            {
                'players': [
                    {
                        'kill_gold', 643,
                        'kills': 4,
                        'deaths': 13,
                        'assists': 49,
                        'baron_timer': 12145,
                        'elder_timer': 98564,
                        'level': 16
                    },
                    {
                        'kill_gold', 95684,
                        'kills': 56,
                        'deaths': 15,
                        'assists': 12,
                        'baron_timer': 32569,
                        'elder_timer': 12345,
                        'level': 9
                    },
                    {
                        'kill_gold', 85695,
                        'kills': 52,
                        'deaths': 7,
                        'assists': 32,
                        'baron_timer': 65983,
                        'elder_timer': 4856,
                        'level': 15
                    },
                    {
                        'kill_gold', 21639,
                        'kills': 10,
                        'deaths': 1,
                        'assists': 0,
                        'baron_timer': 256983,
                        'elder_timer': 14582,
                        'level': 13
                    }
                ],
                'drakes': ['EARTH_DRAGON'],
                'rifts': 1,
                'grubs': 0,
                'towers': [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 125],
                'inhibs': [0, 0, 0]
            }
        ],
        'win': True,
        'time': 100
    }

    pred = vectorize_state(state)
    truth = [0, 0, 0, 0, 0]