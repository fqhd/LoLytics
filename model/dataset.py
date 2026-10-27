import os
import json
import numpy as np
from model.game import sample_t

with open('champion_to_index.json') as f:
    champion_to_index = json.load(f)

DRAKE_TYPES = ['EARTH_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON',
               'HEXTECH_DRAGON', 'FIRE_DRAGON', 'WATER_DRAGON']

RANKS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD',
         'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']

STORAGE_DTYPE = np.float32
MIN_GAME_MS = 5 * 60_000


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


def rank_to_elo(rank):
    return RANKS.index(rank) + 1


def create_game_state(game, rng):
    last_t = game['events'][-1]['timestamp']
    if last_t <= MIN_GAME_MS:
        return None, None

    t = int(rng.integers(0, last_t + 1))
    state = sample_t(game, t)

    v = vectorize_state(state)
    return np.asarray(v, dtype=STORAGE_DTYPE), int(state['win'])


def create_dataset(root, seed=None):
    rng = np.random.default_rng(seed)
    states, labels = [], []

    for rank in os.listdir(root):
        if rank == '.DS_Store':
            continue
        for tier in os.listdir(os.path.join(root, rank)):
            if tier == '.DS_Store':
                continue
            for filename in os.listdir(os.path.join(root, rank, tier)):
                if filename == '.DS_Store':
                    continue
                with open(os.path.join(root, rank, tier, filename)) as fh:
                    game = json.load(fh)

                v, win = create_game_state(game, rng)
                if v is None:
                    continue

                states.append(v)
                labels.append(win)

                if len(labels) % 5000 == 0:
                    print(f'  processed {len(labels)} games')

    return (np.stack(states),
            np.asarray(labels, dtype=np.uint8))


def load_split(prefix):
    states = np.load(f'{prefix}_states.npy')
    labels = np.load(f'{prefix}_labels.npy')
    return states, labels


if __name__ == '__main__':
    print('--- train split ---')
    train_x, train_y = create_dataset('dataset/train', seed=0)
    np.save('train_states.npy', train_x)
    np.save('train_labels.npy', train_y)
    print(f'wrote {len(train_y)} games, states shape {train_x.shape}')

    print('--- test split ---')
    test_x, test_y = create_dataset('dataset/test', seed=1)
    np.save('test_states.npy', test_x)
    np.save('test_labels.npy', test_y)
    print(f'wrote {len(test_y)} games, states shape {test_x.shape}')
