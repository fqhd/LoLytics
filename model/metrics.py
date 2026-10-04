import numpy as np
from sklearn.metrics import accuracy_score, log_loss


def _to_numpy(x):
    if x is None:
        return None
    if hasattr(x, "detach"):
        x = x.detach()
    if hasattr(x, "cpu"):
        x = x.cpu()
    return np.asarray(x)


def _as_1d_int(y):
    y = _to_numpy(y)
    if y is None:
        return None

    if y.ndim > 1:
        if y.shape[1] > 1:
            y = np.argmax(y, axis=1)
        else:
            y = y.reshape(-1)
    else:
        y = y.reshape(-1)

    return y.astype(int)


def _ece_from_conf_acc(confidences, accuracies, n_bins=10):
    confidences = np.asarray(confidences, dtype=float).reshape(-1)
    accuracies = np.asarray(accuracies, dtype=float).reshape(-1)

    if confidences.size != accuracies.size:
        raise ValueError("confidences and accuracies must have the same length")
    if confidences.size == 0:
        return 0.0

    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = confidences.size

    for m in range(n_bins):
        lower = bins[m]
        upper = bins[m + 1]

        # Include 0.0 in the first bin and 1.0 in the last bin.
        if m == n_bins - 1:
            mask = (confidences >= lower) & (confidences <= upper)
        else:
            mask = (confidences >= lower) & (confidences < upper)

        count = np.sum(mask)
        if count > 0:
            avg_conf = np.mean(confidences[mask])
            avg_acc = np.mean(accuracies[mask])
            ece += (count / n) * abs(avg_acc - avg_conf)

    return float(ece)


def ece_score(probs, y_true, n_bins=10):
    """
    Expected Calibration Error for multiclass / binary probabilities.

    probs:
      - (N, C) array of class probabilities, or
      - (N,) / (N, 1) array of positive-class probabilities for binary.

    y_true:
      - (N,) integer labels, or
      - (N, C) one-hot labels.
    """
    probs = _to_numpy(probs)
    y_true = _as_1d_int(y_true)

    if probs.ndim == 1:
        probs = probs.reshape(-1, 1)

    if probs.ndim != 2:
        raise ValueError("probs must be a 1D or 2D array")

    if probs.shape[0] != y_true.shape[0]:
        raise ValueError("probs and y_true must have the same number of samples")

    # Single-column binary output: convert to two-class probabilities.
    if probs.shape[1] == 1:
        p = probs.ravel()
        probs = np.column_stack([1.0 - p, p])

    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    accuracies = (predictions == y_true).astype(float)

    return _ece_from_conf_acc(confidences, accuracies, n_bins=n_bins)


def ece_score_binary(probs, y_true, n_bins=10):
    """
    Binary top-label ECE compatibility wrapper.

    Accepts either positive-class probabilities (N,) / (N, 1) or
    two-column probabilities (N, 2). Uses max(p, 1-p) as confidence,
    matching the original binary ECE implementation.
    """
    probs = _to_numpy(probs)

    if probs.ndim == 2 and probs.shape[1] == 2:
        return ece_score(probs, y_true, n_bins=n_bins)

    p = probs.reshape(-1)
    y_true = _as_1d_int(y_true)

    if p.size != y_true.size:
        raise ValueError("probs and y_true must have the same length")

    probs2 = np.column_stack([1.0 - p, p])
    return ece_score(probs2, y_true, n_bins=n_bins)


def compute_model_output_metrics(y_true, y_pred, probs):
    """
    Compute accuracy, ECE, spread, and BCE/log-loss.

    y_pred may be None; if so, it is derived from probs.
    """
    y_true = _as_1d_int(y_true)
    probs = _to_numpy(probs)

    if y_pred is None:
        if probs.ndim == 1:
            y_pred = (probs >= 0.5).astype(int)
        elif probs.ndim == 2 and probs.shape[1] == 1:
            y_pred = (probs.ravel() >= 0.5).astype(int)
        else:
            y_pred = probs.argmax(axis=1)
    else:
        y_pred = _as_1d_int(y_pred)

    accuracy = accuracy_score(y_true, y_pred)
    ece = ece_score(probs, y_true)

    # Spread of the predicted probability of interest.
    if probs.ndim == 1:
        spread = probs.std()
    elif probs.ndim == 2 and probs.shape[1] == 1:
        spread = probs.ravel().std()
    elif probs.ndim == 2 and probs.shape[1] == 2:
        spread = probs[:, 1].std()
    else:
        spread = probs.max(axis=1).std()

    # log_loss wants 1D probabilities for binary single-output models.
    if probs.ndim == 2 and probs.shape[1] == 1:
        probs_for_log_loss = probs.ravel()
    else:
        probs_for_log_loss = probs

    bce = log_loss(y_true, probs_for_log_loss)

    return {
        "acc": float(accuracy),
        "ece": float(ece),
        "spread": float(spread),
        "bce": float(bce),
    }
