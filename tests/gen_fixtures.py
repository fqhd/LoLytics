import sys
import os
import json

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../model')))

from create_lmdb_dataset import convert_json_sample_to_list

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
