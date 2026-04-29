import os, json, random
import numpy as np
from model.game import sample_t

with open('champion_to_index.json') as f:
    champion_to_index = json.load(f)

def vectorize_state(state):
    v = []

    for champion in state['champions']:
        champion_index = champion_to_index[champion]
        v.append(champion_index)

    for team in state['teams']:
        for player in team['players']:
            for key in player:
                v.append(player[key])

        drakes = ['EARTH_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON', 'HEXTECH_DRAGON', 'FIRE_DRAGON', 'WATER_DRAGON']
        for drake in team['drakes']:
            drakes_oh = [0, 0, 0, 0, 0, 0]
            drakes_oh[drakes.index(drake)] = 1
            v += drakes_oh
        for _ in range(4 - len(team['drakes'])):
            v += [0, 0, 0, 0, 0, 0]
        v.append(team['rifts'])
        v.append(team['grubs'])
        v += team['towers']
        v += team['inhibs']
    v.append(state['time'])

    return v

def rank_to_elo(rank):
    ranks = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
    return ranks.index(rank) + 1

def create_dataset(root):
    states = []
    labels = []

    for rank in os.listdir(root):
        if rank == '.DS_Store':
            continue
        for tier in os.listdir(os.path.join(root, rank)):
            if tier == '.DS_Store':
                continue
            for filename in os.listdir(os.path.join(root, rank, tier)):
                if filename == '.DS_Store':
                    continue
                with open(os.path.join(root, rank, tier, filename)) as f:
                    game = json.load(f)
                if game['events'][-1]['timestamp'] > 60_000 * 5:
                    t = random.randint(0, game['events'][-1]['timestamp'])
                    state = sample_t(game, t)
                    state_vector = vectorize_state(state)
                    state_vector.append(rank_to_elo(rank))
                    states.append(state_vector)
                    labels.append(int(state['win']))
                    if len(labels) % 1000 == 0:
                        print(f'Processed {len(labels)} files')

    return (np.array(states, dtype=np.uint32), np.array(labels, dtype=np.uint8))

if __name__ == '__main__':
    train_x, train_y = create_dataset('dataset/train')
    np.save('train_x.npy', train_x)
    np.save('train_y.npy', train_y)

    test_x, test_y = create_dataset('dataset/test')
    np.save('test_x.npy', test_x)
    np.save('test_y.npy', test_y)
