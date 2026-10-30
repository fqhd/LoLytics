DRAKE_TYPES = ['EARTH_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON',
               'HEXTECH_DRAGON', 'FIRE_DRAGON', 'WATER_DRAGON']

def vectorize_state(state):
    """161 state features; time (ms) is the last feature."""
    v = []
    for team in state['teams']:
        for player in team['players']:
            for key in player:
                v.append(player[key])

        for drake in team['drakes']:
            drakes_oh = [0] * 6
            drakes_oh[DRAKE_TYPES.index(drake)] = 1
            v += drakes_oh
        for _ in range(4 - len(team['drakes'])):
            v += [0] * 6

        v.append(team['rifts'])
        v.append(team['grubs'])
        v += team['towers']
        v += team['inhibs']

    v.append(state['time'])
    return v
