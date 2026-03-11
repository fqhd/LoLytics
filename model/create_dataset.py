import os, json, random
import numpy as np
from model.game import sample

with open('champion_to_index.json') as f:
    champion_to_index = json.load(f)

def vectorize_state(state):
    v = []

    champion_array = [0] * len(champion_to_index.keys())
    for champion in state['champions'][:5]:
        champion_index = champion_to_index[champion]
        champion_array[champion_index] = 1
    for champion in state['champions'][5:]:
        champion_index = champion_to_index[champion]
        champion_array[champion_index] = -1
    v += champion_array

    for team in state['teams']:
        for player in team['players']:
            for key in player:
                v.append(player[key])

        drakes = ['EARTH_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON', 'HEXTECH_DRAGON', 'FIRE_DRAGON', 'WATER_DRAGON']
        drakes_oh = [0, 0, 0, 0, 0, 0]
        for drake in team['drakes']:
            drakes_oh[drakes.index(drake)] += 1
        v.append(team['rifts'])
        v.append(team['grubs'])
        v += team['towers']
        v += team['inhibs']
        v += drakes_oh
    v.append(state['time'])

    return v

def create_dataset(root):
	states = []
	labels = []

	for rank in os.listdir(root):
		if rank == 'MASTER':
			for filename in os.listdir(os.path.join(root, rank)):
				with open(os.path.join(root, rank, filename)) as f:
					game = json.load(f)
				idx = random.randint(0, len(game['events']) - 1)
				state = sample(game, idx)
				states.append(vectorize_state(state))
				labels.append(int(state['win']))
				if len(labels) % 1000 == 0:
					print(f'Processed {len(labels)} files')
		else:
			for tier in os.listdir(os.path.join(root, rank)):
				for filename in os.listdir(os.path.join(root, rank, tier)):
					with open(os.path.join(root, rank, tier, filename)) as f:
						game = json.load(f)
					idx = random.randint(0, len(game['events']) - 1)
					state = sample(game, idx)
					states.append(vectorize_state(state))
					labels.append(int(state['win']))
					if len(labels) % 1000 == 0:
						print(f'Processed {len(labels)} files')

	return (np.array(states, dtype=np.float32), np.array(labels, dtype=np.uint8))

if __name__ == '__main__':
	train_x, train_y = create_dataset('dataset/train')
	np.save('train_x.npy', train_x)
	np.save('train_y.npy', train_y)

	test_x, test_y = create_dataset('dataset/test')
	np.save('test_x.npy', test_x)
	np.save('test_y.npy', test_y)
