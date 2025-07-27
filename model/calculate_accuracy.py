import torch
from dataset import Dataset
from dnn import DNN
from tqdm import tqdm
import matplotlib.pyplot as plt

dataset = Dataset('test.lmdb')

data_iter = iter(dataset)

acc = 0
total = 0

net = DNN()
net.load_state_dict(torch.load('dnn.pth', weights_only=True))

with torch.no_grad():
    for sample in tqdm(dataset):
        inputs, label = sample

        inputs = torch.tensor(inputs).view(1, -1)

        y = net(inputs)
        ans = 0
        if y.item() > 0.5:
            ans = 1

        if label == ans:
            acc += 1
        total += 1

print(acc / total)


# for i in range(40):
#     l[i] /= max(t[i], 1)
#     l[i] *= 100
#     l[i] = round(l[i])

# x = list(range(40))

# plt.figure(figsize=(8, 5))
# plt.bar(x, l)
# plt.xlabel('Time Interval')
# plt.ylabel('Accuracy')
# plt.title('Model Accuracy Over Time')
# plt.yticks(list(range(0, 100, 10)))
# plt.show()
