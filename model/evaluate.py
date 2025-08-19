import torch
from dnn import DNN
from dataset import Dataset

def load_network(stats='stats.json', champ_to_idx='champion_to_index.json', embeddings='data.csv', weights='dnn.pth'):
    net = DNN(stats, champ_to_idx, embeddings)
    net.load_state_dict(torch.load(weights, weights_only=True))
    net.eval()
    return net

def load_dataset():
    dataset = Dataset('test.lmdb')
    return dataset