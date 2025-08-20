import sys
import os
import json
import torch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../model')))

from create_lmdb_dataset import convert_json_sample_to_list
from evaluate import load_network

def generate_game_state_fixtures():
    tests = []

    for i in range(1, 11):
        filename = f'state_{i}.json'
        path = f'tests/states/{filename}'
        with open(path, 'r') as f:
            data = json.load(f)
        tests.append((data, filename))

    with open('model/champion_to_index.json') as f:
        champ_to_idx = json.load(f)

    results = [(filename, inp, convert_json_sample_to_list(inp, champ_to_idx)[:-1]) for inp, filename in tests]

    with open('tests/fixtures.json', 'w') as f:
        json.dump(results, f)

    print('Successfully generated state fixtures')

def generate_model_integrity_fixtures():
    net = load_network('model/stats.json', 'model/champion_to_index.json', 'model/data.csv', 'model/dnn.pth')

    fixture = []

    with open('model/champion_to_index.json') as f:
        champ_to_idx = json.load(f)

    for i in range(1, 11):
        filename = f'state_{i}.json'
        path = f'tests/states/{filename}'
        with open(path, 'r') as f:
            data = json.load(f)
            
        inp = convert_json_sample_to_list(data, champ_to_idx)[:-1]
        inp_t = torch.tensor(inp, dtype=torch.int32).view(1, -1)
        with torch.no_grad():
            output = net(inp_t).item()
        
        fixture.append({
            'input': inp,
            'output': output
        })
    
    with open('tests/integration.json', 'w') as f:
        json.dump(fixture, f)
    
    print('Successfully generated model integration fixtures')

def main():
    generate_game_state_fixtures()
    generate_model_integrity_fixtures()

if __name__ == '__main__':
    main()
