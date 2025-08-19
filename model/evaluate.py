import torch
from dnn import DNN
from dataset import Dataset

def load_network():
    net = DNN('stats.json', 'champion_to_index.json', 'data.csv')
    net.load_state_dict(torch.load('dnn.pth', weights_only=True))
    net.eval()
    return net

def load_dataset():
    dataset = Dataset('test.lmdb')
    return dataset