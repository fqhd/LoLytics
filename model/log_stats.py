import numpy as np

X_train, y_train = np.load('train_x.npy'), np.load('train_y.npy')
X_test, y_test = np.load('test_x.npy'), np.load('test_y.npy')

means = X_train.mean(axis=0)
std = X_train.std(axis=0)

# Drakes
means[50:50+24] = 0
means[130:130+24] = 0
std[50:50+24] = 1
std[130:130+24] = 1

# Inhibs
means[167:170] = 0
means[87:90] = 0
std[167:170] = 300000
std[87:90] = 300000

# Towers
means[165:167] = 0
means[85:87] = 0
std[165:167] = 180000
std[85:87] = 180000

print('Means:')
for v in means[10:-1]:
    print(f'{v.item()}, ', end='')
print(f'{means[-1]}')

print('Std:')
for v in std[10:-1]:
    print(f'{v.item()}, ', end='')
print(f'{std[-1]}')
