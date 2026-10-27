import json

with open('item.json') as f:
    item = json.load(f)

item_str = ''

for k in item['data']:
    id = int(k)
    name = item['data'][k]['name']

    if id < 9999:
        item_str += f'{id} {name}\n'

with open('item_mapping.txt', 'w') as f:
    f.write(item_str)
