import torch
from dnn import DNN
from dataset import Dataset

def load_network():
    net = DNN()
    net.load_state_dict(torch.load('dnn.pth', weights_only=True))
    net.eval()
    return net

def load_dataset():
    dataset = Dataset('test.lmdb')
    return dataset