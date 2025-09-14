import torch
import numpy as np
from tqdm import tqdm
from dnn import DNN
from dataset import Dataset
import matplotlib.pyplot as plt
import seaborn as sns
from evaluate import load_network, load_dataset

def plot_distribution(arr, bins=30, title="Distribution Plot", xlabel="Values"):
    plt.figure(figsize=(8, 5))
    sns.histplot(arr, bins=bins, kde=True, color='skyblue', edgecolor='black')
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel("Frequency")
    plt.grid(True)
    plt.show()

def compute_outputs_on_dataset(model, dataset):
    outputs = []

    with torch.no_grad():
        for inputs, _ in tqdm(dataset):
            y = model(torch.tensor(inputs).view(1, -1))
            outputs.append(torch.sigmoid(y).item())
    
    return np.array(outputs)

def main():
    net = load_network()
    dataset = load_dataset()

    outputs = compute_outputs_on_dataset(net, dataset)
    plot_distribution(outputs)

if __name__ == '__main__':
    main()