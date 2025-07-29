from model.create_lmdb_dataset import convert_json_sample_to_numpy
import numpy as np
import json

def test_convert_json_sample_to_numpy():
    with open('model/champion_to_index.json') as f:
        champ_to_idx = json.load(f)
    
    obj = {
        "teams": [
            {
                "players": [
                    {
                        "champion": "Malphite",
                        "kills": 4,
                        "deaths": 1,
                        "assists": 4,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 9790,
                        "level": 15,
                        "creepscore": 191,
                        "x": 513,
                        "y": 412
                    },
                    {
                        "champion": "Hecarim",
                        "kills": 7,
                        "deaths": 4,
                        "assists": 5,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 9945,
                        "level": 13,
                        "creepscore": 128,
                        "x": 1447,
                        "y": 709
                    },
                    {
                        "champion": "Fizz",
                        "kills": 4,
                        "deaths": 5,
                        "assists": 7,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 9298,
                        "level": 14,
                        "creepscore": 151,
                        "x": 2064,
                        "y": 949
                    },
                    {
                        "champion": "Kaisa",
                        "kills": 2,
                        "deaths": 11,
                        "assists": 1,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 7189,
                        "level": 12,
                        "creepscore": 140,
                        "x": 394,
                        "y": 461
                    },
                    {
                        "champion": "Taric",
                        "kills": 0,
                        "deaths": 6,
                        "assists": 4,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 5182,
                        "level": 11,
                        "creepscore": 25,
                        "x": 394,
                        "y": 461
                    }
                ],
                "drakes": [
                    "CHEMTECH_DRAGON"
                ],
                "rifts": 1,
                "atakhan": 0,
                "grubs": 3,
                "towers": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    3,
                    3
                ],
                "inhibs": [
                    4,
                    1,
                    0
                ]
            },
            {
                "players": [
                    {
                        "champion": "Yone",
                        "kills": 3,
                        "deaths": 4,
                        "assists": 3,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 9636,
                        "level": 15,
                        "creepscore": 203,
                        "x": 5665,
                        "y": 1313
                    },
                    {
                        "champion": "Ekko",
                        "kills": 7,
                        "deaths": 4,
                        "assists": 10,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 12270,
                        "level": 16,
                        "creepscore": 197,
                        "x": 2428,
                        "y": 2722
                    },
                    {
                        "champion": "Vladimir",
                        "kills": 5,
                        "deaths": 2,
                        "assists": 4,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 10547,
                        "level": 16,
                        "creepscore": 206,
                        "x": 2081,
                        "y": 2898
                    },
                    {
                        "champion": "Tristana",
                        "kills": 9,
                        "deaths": 3,
                        "assists": 5,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 12174,
                        "level": 14,
                        "creepscore": 195,
                        "x": 1446,
                        "y": 717
                    },
                    {
                        "champion": "Rell",
                        "kills": 3,
                        "deaths": 4,
                        "assists": 15,
                        "baronTimer": 0,
                        "elderTimer": 0,
                        "deathTimer": 0,
                        "gold": 7890,
                        "level": 12,
                        "creepscore": 25,
                        "x": 1973,
                        "y": 1670
                    }
                ],
                "drakes": [
                    "FIRE_DRAGON",
                    "HEXTECH_DRAGON",
                    "HEXTECH_DRAGON"
                ],
                "rifts": 0,
                "atakhan": 1,
                "grubs": 0,
                "towers": [
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                    0,
                    0
                ],
                "inhibs": [
                    0,
                    0,
                    0
                ]
            }
        ],
        "time": 26,
        "win": False
    }

    target = np.array([
        77, 4, 1, 4, 0, 0, 0, 9790, 15, 191, 513, 412,
        43, 7, 4, 5, 0, 0, 0, 9945, 13, 128, 1447, 709,
        35, 4, 5, 7, 0, 0, 0, 9298, 14, 151, 2064, 949,
        56, 2, 11, 1, 0, 0, 0, 7189, 12, 140, 394, 461,
        134, 0, 6, 4, 0, 0, 0, 5182, 11, 25, 394, 461,
        0, 0, 1, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0,
        1, 0, 3,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        3,
        3,
        4, 1, 0,

        160, 3, 4, 3, 0, 0, 0, 9636, 15, 203, 5665, 1313,
        29, 7, 4, 10, 0, 0, 0, 12270, 16, 197, 2428, 2722,
        152, 5, 2, 4, 0, 0, 0, 10547, 16, 206, 2081, 2898,
        137, 9, 3, 5, 0, 0, 0, 12174, 14, 195, 1446, 717,
        106, 3, 4, 15, 0, 0, 0, 7890, 12, 25, 1973, 1670,
        0, 0, 0, 1, 0, 0,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 0, 0, 0,
        0, 1, 0,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        0,
        0,
        0, 0, 0,
        26, 0
    ])

    assert np.array_equal(convert_json_sample_to_numpy(obj, champ_to_idx), target)
