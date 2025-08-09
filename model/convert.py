import torch
from evaluate import load_network, load_dataset

network = load_network()
dataset = load_dataset()

dummy_data, _ = next(iter(dataset))

print('Number of Inputs:', len(dummy_data))

dummy_input = torch.zeros(size=(1, len(dummy_data)), dtype=torch.int32)
torch.onnx.export(
    network,
    dummy_input,
    "model.onnx",
    input_names=["input"],
    output_names=["output"],
    opset_version=16,
)
