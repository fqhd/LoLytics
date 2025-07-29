import torch
from dataset import Dataset
from dnn import DNN
from tqdm import tqdm
import matplotlib.pyplot as plt

def load_network():
    net = DNN()
    net.load_state_dict(torch.load('dnn.pth', weights_only=True))
    net.eval()
    return net

def load_dataset():
    dataset = Dataset('test.lmdb')
    return dataset

@torch.no_grad()
def calculate_accuracy(model, dataset, num_bins=6, interval_minutes=5):
    correct = [0] * num_bins
    total = [0] * num_bins
    with torch.no_grad():
        for sample in tqdm(dataset):
            inputs, label = sample
            inputs = torch.tensor(inputs).view(1, -1)

            time = inputs[0, -1].item()
            bin_index = int(time // interval_minutes)
            if bin_index >= num_bins:
                continue

            y = model(inputs)
            ans = 1 if y.item() > 0.5 else 0

            total[bin_index] += 1
            if label == ans:
                correct[bin_index] += 1

    accuracy = [0.0] * num_bins
    for i in range(num_bins):
        if total[i] > 0:
            accuracy[i] = correct[i] / total[i] * 100

    return accuracy

def plot_accuracy(accuracy):
    x_labels = [f"{i*5}-{(i+1)*5}m" for i in range(len(accuracy))]

    plt.figure(figsize=(10, 6))
    plt.bar(x_labels, accuracy, color='skyblue')
    plt.ylim(0, 100)
    plt.xlabel('Time Interval')
    plt.ylabel('Accuracy (%)')
    plt.title('Model Accuracy Over Time')
    plt.grid(axis='y')
    plt.tight_layout()
    plt.show()

if __name__ == '__main__':
    dataset = load_dataset()
    model = load_network()
    accuracy = calculate_accuracy(model, dataset)
    plot_accuracy(accuracy)
