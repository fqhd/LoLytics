import torch
from torch import nn, optim
from tqdm import tqdm
from evaluate import load_network, load_dataset

class TemperatureScaler(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.tensor(1.0))

    def forward(self, logits):
        return logits / self.temperature

def main():
    model = load_network()
    dataset = load_dataset()

    all_logits = []
    all_labels = []

    with torch.no_grad():
        for sample in tqdm(dataset):
            inputs, label = sample
            inputs = torch.tensor(inputs).view(1, -1).float()
            logits = model(inputs)
            all_logits.append(logits)
            all_labels.append(torch.tensor([label], dtype=torch.float32))

    all_logits = torch.cat(all_logits, dim=0)
    all_labels = torch.cat(all_labels, dim=0)

    temperature = TemperatureScaler()
    optimizer = optim.LBFGS([temperature.temperature], lr=0.01, max_iter=200)
    loss_fn = nn.BCEWithLogitsLoss()

    def closure():
        optimizer.zero_grad()
        scaled_logits = temperature(all_logits).view(-1)
        loss = loss_fn(scaled_logits, all_labels)
        loss.backward()
        return loss

    optimizer.step(closure)

    print(f"Optimal temperature: {temperature.temperature.item():.4f}")

if __name__ == "__main__":
    main()
