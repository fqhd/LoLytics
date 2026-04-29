from model.dataset import vectorize_state

def test_vectorize_state():
    state = {
        'champions': ['Annie', 'Riven', 'Aatrox', 'Leona', 'Jinx', 'Aphelios', 'Zaahen', 'Khazix', 'Ahri', 'Anivia'],
        'teams': [
            {
                'players': [
                    {
                        'kill_gold': 740,
                        'kills': 8,
                        'deaths': 3,
                        'assists': 4,
                        'baron_timer': 84924,
                        'elder_timer': 4982,
                        'level': 5
                    },
                    {
                        'kill_gold': 545,
                        'kills': 9,
                        'deaths': 14,
                        'assists': 20,
                        'baron_timer': 47194,
                        'elder_timer': 1649,
                        'level': 8
                    },
                    {
                        'kill_gold': 12159,
                        'kills': 6,
                        'deaths': 5,
                        'assists': 31,
                        'baron_timer': 4658,
                        'elder_timer': 71654,
                        'level': 17
                    },
                    {
                        'kill_gold': 56598,
                        'kills': 12,
                        'deaths': 8,
                        'assists': 9,
                        'baron_timer': 13265,
                        'elder_timer': 84569,
                        'level': 11
                    },
                    {
                        'kill_gold': 58,
                        'kills': 1,
                        'deaths': 13,
                        'assists': 2,
                        'baron_timer': 0,
                        'elder_timer': 0,
                        'level': 9
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
                        'kill_gold': 643,
                        'kills': 4,
                        'deaths': 13,
                        'assists': 49,
                        'baron_timer': 12145,
                        'elder_timer': 98564,
                        'level': 16
                    },
                    {
                        'kill_gold': 95684,
                        'kills': 56,
                        'deaths': 15,
                        'assists': 12,
                        'baron_timer': 32569,
                        'elder_timer': 12345,
                        'level': 9
                    },
                    {
                        'kill_gold': 85695,
                        'kills': 52,
                        'deaths': 7,
                        'assists': 32,
                        'baron_timer': 65983,
                        'elder_timer': 4856,
                        'level': 15
                    },
                    {
                        'kill_gold': 21639,
                        'kills': 10,
                        'deaths': 1,
                        'assists': 0,
                        'baron_timer': 256983,
                        'elder_timer': 14582,
                        'level': 13
                    },
                    {
                        'kill_gold': 5,
                        'kills': 12,
                        'deaths': 32,
                        'assists': 8,
                        'baron_timer': 56,
                        'elder_timer': 56,
                        'level': 19
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
    truth = [8, 110, 0, 71, 54, 9, 164, 65, 1, 7, 740, 8, 3, 4, 84924, 4982, 5, 545, 9, 14, 20, 47194, 1649, 8, 12159, 6, 5, 31, 4658, 71654, 17, 56598, 12, 8, 9, 13265, 84569, 11, 58, 1, 13, 2, 0, 0, 9, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 492, 48958, 0, 3274, 23983, 643, 4, 13, 49, 12145, 98564, 16, 95684, 56, 15, 12, 32569, 12345, 9, 85695, 52, 7, 32, 65983, 4856, 15, 21639, 10, 1, 0, 256983, 14582, 13, 5, 12, 32, 8, 56, 56, 19, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 125, 0, 0, 0, 100]

    assert len(pred) == len(truth)
    for i in range(len(pred)):
        assert pred[i] == truth[i]
