from dataset import Dataset
import numpy as np
import json

dataset = Dataset('train.lmdb')

kills = []
deaths = []
assists = []
gold = []
creepscore = []

data_iter = iter(dataset)

for i in range(len(dataset)):
    sample, _ = next(data_iter)
    for team_offset in [0, 12*5+24+3+11+3]:
        for j in range(5):
            player_offset = j * 12
            offset = team_offset + player_offset

            kills.append(sample[offset + 1].item())
            deaths.append(sample[offset + 2].item())
            assists.append(sample[offset + 3].item())
            gold.append(sample[offset + 7].item())
            creepscore.append(sample[offset + 9].item())

kills = np.array(kills)
deaths = np.array(deaths)
assists = np.array(assists)
gold = np.array(gold)
creepscore = np.array(creepscore)

stats = {
    'kills': {
        'std': kills.std().item(),
        'mean': kills.mean().item()
    },
    'deaths': {
        'std': deaths.std().item(),
        'mean': deaths.mean().item()
    },
    'assists': {
        'std': assists.std().item(),
        'mean': assists.mean().item()
    },
    'gold': {
        'std': gold.std().item(),
        'mean': gold.mean().item()
    },
    'creepscore': {
        'std': creepscore.std().item(),
        'mean': creepscore.mean().item()
    }
}

with open('stats.json', 'w') as f:
    json.dump(stats, f)
