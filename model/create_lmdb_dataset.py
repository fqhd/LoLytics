import numpy as np
import json
import lmdb
import pickle
from tqdm import tqdm
import os
import random

def convert_json_sample_to_list(sample, champ_to_idx):
    arr = []

    dragon_names = ['WATER_DRAGON', 'AIR_DRAGON', 'CHEMTECH_DRAGON', 'FIRE_DRAGON', 'HEXTECH_DRAGON', 'EARTH_DRAGON']
    player_keys = [
        'champion', 'kills', 'deaths', 'assists', 'baronTimer', 'elderTimer',
        'deathTimer', 'gold', 'level', 'creepscore', 'x', 'y'
    ]

    for team in sample['teams']:
        for player in team['players']:
            for k in player_keys:
                if k == 'champion':
                    arr.append(champ_to_idx[player['champion']])
                elif k == 'deathTimer':
                    arr.append(round(player['deathTimer']))
                else:
                    arr.append(player[k])

        for i in range(4):
            one_hot = [0, 0, 0, 0, 0, 0]
            if i < len(team['drakes']):
                name = team['drakes'][i]
                one_hot[dragon_names.index(name)] = 1
            arr += one_hot
        arr.append(team['rifts'])
        arr.append(team['atakhan'])
        arr.append(team['grubs'])
        arr += team['towers']
        arr += team['inhibs']
    arr.append(sample['time'])
    arr.append(sample['win'])

    return arr

def get_game_paths(data_dir):
    paths = []

    for rank in os.listdir(data_dir):
        if rank == '.DS_Store':
            continue
        for match_dir in os.listdir(os.path.join(data_dir, rank)):
            if match_dir == '.DS_Store':
                continue
            paths.append(os.path.join(data_dir, rank, match_dir))

    return paths

def save_lmdb(paths, lmdb_path):
    map_size = 1 << 40
    env = lmdb.open(lmdb_path, map_size=map_size)

    with open('champion_to_index.json') as f:
        champ_to_idx = json.load(f)

    idx = 0
    with env.begin(write=True) as txn:
        for path in tqdm(paths):
            with open(path) as f:
                obj = json.load(f)
                arr = convert_json_sample_to_list(obj, champ_to_idx)
                data = np.array(arr, dtype='int32')
            key = str(idx).encode()
            value = pickle.dumps(data)
            txn.put(key, value)
            idx += 1

def main():
    paths = get_game_paths('../match_data')
    random.shuffle(paths)

    split = 0.9

    num_train_samples = int(len(paths) * split)
    train_paths = paths[:num_train_samples]
    test_paths = paths[num_train_samples:]

    save_lmdb(train_paths, 'train.lmdb')
    save_lmdb(test_paths, 'test.lmdb')


if __name__ == '__main__':
    main()
