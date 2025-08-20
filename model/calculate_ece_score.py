import torch
import numpy as np
from tqdm import tqdm
from evaluate import load_network, load_dataset

def compute_ece_binary(probs, labels, n_bins=10):
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(probs)

    for i in range(n_bins):
        start = bin_boundaries[i]
        end = bin_boundaries[i + 1]

        mask = (probs > start) & (probs <= end)
        bin_size = np.sum(mask)

        if bin_size > 0:
            bin_confidence = np.mean(probs[mask])
            preds = (probs[mask] > 0.5).astype('int32')
            bin_accuracy = np.mean(labels[mask] == preds)
            bin_error = abs(bin_confidence - bin_accuracy)
            ece += (bin_size / n) * bin_error

    return ece

def main():
    model = load_network()
    dataset = load_dataset()

    all_probs = []
    all_labels = []

    with torch.no_grad():
        for sample in tqdm(dataset):
            inputs, label = sample
            inputs = torch.tensor(inputs).view(1, -1).float()

            y = model(inputs)
            prob = torch.sigmoid(y).item()

            all_probs.append(prob)
            all_labels.append(label)

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)

    ece_score = compute_ece_binary(all_probs, all_labels, n_bins=10)
    print(f"ECE score (10 bins): {ece_score:.4f}")

if __name__ == "__main__":
    main()
