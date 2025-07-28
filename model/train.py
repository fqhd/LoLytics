from dataset import Dataset
from dnn import DNN
import torch
from torch import nn
from torch import optim
from torch.utils.data import DataLoader
from tqdm import tqdm
import matplotlib.pyplot as plt

net = DNN()

train_ds = Dataset('train.lmdb')
test_ds = Dataset('test.lmdb')
train_dl = DataLoader(train_ds, batch_size=1024, shuffle=True)
test_dl = DataLoader(test_ds, batch_size=512, shuffle=True)

optimizer = optim.SGD(net.parameters(), lr=2e-4, momentum=0.99)
loss_fn = nn.MSELoss()

def train_epoch(model, optimizer, criterion, dataloader):
    model.train()
    avg_loss = 0

    for inputs, labels in tqdm(dataloader):
        y_pred = model(inputs)
        loss = criterion(y_pred, labels.float().view(-1, 1))

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        avg_loss += loss.item()

    avg_loss /= len(dataloader)

    return avg_loss

def test(model, optimizer, criterion, dataloader):
    model.eval()
    avg_loss = 0

    with torch.no_grad():
        for inputs, labels in tqdm(dataloader):
            inputs, labels = inputs, labels

            y_pred = model(inputs)
            loss = criterion(y_pred, labels.float().view(-1, 1))

            avg_loss += loss.item()

        avg_loss /= len(dataloader)

    return avg_loss

initial_loss = test(net, optimizer, loss_fn, test_dl)
print(f'Initial Test Loss: {initial_loss}')

train_losses = []
test_losses = []
for epoch in range(50):
    train_loss = train_epoch(net, optimizer, loss_fn, train_dl)
    test_loss = test(net, optimizer, loss_fn, test_dl)
    train_losses.append(train_loss)
    test_losses.append(test_loss)
    print(f'Epoch {epoch+1}) Train loss: {train_loss} Test loss: {test_loss}')

plt.figure(figsize=(8, 5))
plt.title('Training And Testing Loss')
plt.plot(train_losses, label='Train')
plt.plot(test_losses, label='Test')
plt.legend()
plt.show()

torch.save(net.state_dict(), 'dnn.pth')
