import torch
import numpy as np
from tqdm import tqdm
from evaluate import load_network, load_dataset
import argparse
import matplotlib.pyplot as plt

def compute_ece_binary(probs, labels, n_bins=10, plot=False):
    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(probs)

    bin_confidences = []
    bin_accuracies = []
    bin_centers = []

    for i in range(n_bins):
        start = bin_boundaries[i]
        end = bin_boundaries[i + 1]

        mask = (probs > start) & (probs <= end)
        bin_size = np.sum(mask)

        if bin_size > 0:
            bin_confidence = np.mean(probs[mask])
            bin_accuracy = np.mean(labels[mask].astype(float))
            bin_error = abs(bin_confidence - bin_accuracy)
            ece += (bin_size / n) * bin_error
        else:
            bin_confidence = 0.0
            bin_accuracy = 0.0

        bin_confidences.append(bin_confidence)
        bin_accuracies.append(bin_accuracy)
        bin_centers.append((start + end) / 2)

    if plot:
        width = (bin_boundaries[1] - bin_boundaries[0]) * 0.4
        plt.figure(figsize=(8, 6))
        plt.bar(np.array(bin_centers) - width/2, bin_accuracies,
                width=width, label="Accuracy", alpha=0.7)
        plt.bar(np.array(bin_centers) + width/2, bin_confidences,
                width=width, label="Confidence", alpha=0.7)
        plt.plot([0, 1], [0, 1], linestyle="--", color="black")  # perfect calibration
        plt.xticks(bin_boundaries)
        plt.xlabel("Confidence bins")
        plt.ylabel("Win Probability")
        plt.title("ECE Score Calculation")
        plt.legend()
        plt.show()

    return ece

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--temperature', type=float, default=1.0,
                        help='Optional temperature to scale logits before sigmoid')
    parser.add_argument('--plot', action='store_true',
                        help='Plot the reliability diagram')
    args = parser.parse_args()

    temperature = args.temperature

    model = load_network()
    dataset = load_dataset()

    all_probs = []
    all_labels = []

    with torch.no_grad():
        for sample in tqdm(dataset):
            inputs, label = sample
            inputs = torch.tensor(inputs).view(1, -1).float()

            logits = model(inputs)
            scaled_logits = torch.sigmoid(logits / temperature)
            prob = scaled_logits.item()

            all_probs.append(prob)
            all_labels.append(label)

    all_probs = np.array(all_probs)
    all_labels = np.array(all_labels)

    ece_score = compute_ece_binary(all_probs, all_labels, n_bins=10, plot=args.plot)
    print(f"ECE score (10 bins) with temperature {temperature}: {ece_score * 100:.2f}%")

if __name__ == "__main__":
    main()
