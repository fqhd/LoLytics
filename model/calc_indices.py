kill_indices = []
death_indices = []
assist_indices = []
gold_indices = []
cs_indices = []
baron_indices = []
elder_indices = []
death_timer_indices = []
level_indices = []
x_indices = []
y_indices = []

for team_offset in [0, 11*5+24+3+11+3]:
    for j in range(5):
        player_offset = j * 11
        offset = team_offset + player_offset

        kill_indices.append(offset)
        death_indices.append(offset+1)
        assist_indices.append(offset+2)
        baron_indices.append(offset+3)
        elder_indices.append(offset+4)
        death_timer_indices.append(offset+5)
        gold_indices.append(offset+6)
        level_indices.append(offset+7)
        cs_indices.append(offset+8)
        x_indices.append(offset+9)
        y_indices.append(offset+10)

print('kill_indices', kill_indices)
print('death_indices', death_indices)
print('assist_indices', assist_indices)
print('gold_indices', gold_indices)
print('cs_indices', cs_indices)
print('baron_indices', baron_indices)
print('elder_indices', elder_indices)
print('death_timer_indices', death_timer_indices)
print('level_indices', level_indices)
print('x_indices', x_indices)
print('y_indices', y_indices)