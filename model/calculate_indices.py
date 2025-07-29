def calculate_offset_indices(champion_size, offset):
    if offset < 0:
        raise ValueError('offset must be greater than 0')
    if offset >= champion_size:
        raise ValueError('offset must be less than champion_size')

    indices = []
    for team_offset in [0, champion_size*5+24+3+11+3]:
        for j in range(5):
            player_offset = j * champion_size
            index = team_offset + player_offset
            indices.append(index+offset)
    return indices

if __name__ == '__main__':
    champion_size = int(input('Champion Size: '))
    for i in range(champion_size):
        indices = calculate_offset_indices(champion_size, i)
        print(f'{i}) {indices}')
