import numpy as np
from sklearn.metrics import accuracy_score, log_loss

# https://github.com/sirius8050/Expected-Calibration-Error/blob/master/ECE.py
def ece_score(py, y_test, n_bins=10):
    py = np.array(py)
    y_test = np.array(y_test)
    if y_test.ndim > 1:
        y_test = np.argmax(y_test, axis=1)
    py_index = np.argmax(py, axis=1)
    py_value = []
    for i in range(py.shape[0]):
        py_value.append(py[i, py_index[i]])
    py_value = np.array(py_value)
    acc, conf = np.zeros(n_bins), np.zeros(n_bins)
    Bm = np.zeros(n_bins)
    for m in range(n_bins):
        a, b = m / n_bins, (m + 1) / n_bins
        for i in range(py.shape[0]):
            if py_value[i] > a and py_value[i] <= b:
                Bm[m] += 1
                if py_index[i] == y_test[i]:
                    acc[m] += 1
                conf[m] += py_value[i]
        if Bm[m] != 0:
            acc[m] = acc[m] / Bm[m]
            conf[m] = conf[m] / Bm[m]
    ece = 0
    for m in range(n_bins):
        ece += Bm[m] * np.abs((acc[m] - conf[m]))
    return ece / sum(Bm)

def ece_score_binary(py, y_test, n_bins=10):
    py = np.array(py)
    y_test = np.array(y_test).squeeze()

    # convert sigmoid output to 2-class probabilities
    py = np.concatenate([1 - py, py], axis=1)

    py_index = np.argmax(py, axis=1)
    py_value = py[np.arange(len(py)), py_index]

    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for m in range(n_bins):
        mask = (py_value >= bins[m]) & (py_value < bins[m+1])
        if np.any(mask):
            acc = np.mean(py_index[mask] == y_test[mask])
            conf = np.mean(py_value[mask])
            ece += np.sum(mask) * abs(acc - conf)

    return ece / len(py)

def compute_model_output_metrics(y_true, y_pred, probs):
    # standard deviation and ece as well here.
    accuracy = accuracy_score(y_true, y_pred)
    ece = ece_score(probs, y_true)
    std = probs.std()
    bce = log_loss(y_true, probs)
    return {
        'acc': accuracy,
        'ece': ece.item(),
        'spread': std.item(),
        'bce': bce
    }
