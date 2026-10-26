import numpy as np
import joblib
import matplotlib.pyplot as plt
import seaborn as sns


CKPT_PATH   = 'logreg.joblib'
STATES_PATH = 'test_states.npy'
LABELS_PATH = 'test_labels.npy'

# Feature layout of the saved states:
#   [0..9]    champions   (ignored by the LR model — dropped at train time)
#   [10..170] vectorize_state output (161 features; time is the last of them)
#   [171]     rank_to_elo
TIME_COL = 170


# -----------------------------------------------------------------------------
# Eval: feed every saved state through the logistic regression in one pass.
# No DataLoader needed — sklearn predictions are a single vectorized call.
# -----------------------------------------------------------------------------
def evaluate_all(model, scaler, feature_cols, states, labels, time_col):
    X = states[:, feature_cols].astype(np.float64)
    X_s = scaler.transform(X)
    probs = model.predict_proba(X_s)[:, 1].astype(np.float64)
    times = states[:, time_col].astype(np.float64)
    return probs, labels.astype(np.int64), times


# -----------------------------------------------------------------------------
# Metrics
# -----------------------------------------------------------------------------
def accuracy(probs, labels):
    return float(((probs > 0.5).astype(np.int64) == labels.astype(np.int64)).mean())


def ece(probs, labels, n_bins=15):
    bins = np.linspace(0, 1, n_bins + 1)
    idx = np.clip(np.digitize(probs, bins, right=True) - 1, 0, n_bins - 1)
    total = 0.0
    for b in range(n_bins):
        m = idx == b
        if m.sum() == 0:
            continue
        total += (m.sum() / len(probs)) * abs(probs[m].mean() - labels[m].mean())
    return float(total)


def bce(probs, labels, eps=1e-7):
    return float(-np.mean(labels * np.log(probs + eps)
                          + (1 - labels) * np.log(1 - probs + eps)))


def spread(probs):
    return float(np.asarray(probs).std())


def print_by_minute(probs, labels, times):
    buckets = [(0, 5), (5, 10), (10, 15), (15, 20), (20, 25),
               (25, 30), (30, 40), (40, 100)]
    print(f'\n{"bucket":>10} | {"n":>6} | {"acc":>7} | {"ECE":>7} | '
          f'{"bce":>7} | {"conf":>7} | {"spread":>7}')
    print('-' * 74)
    for lo, hi in buckets:
        m = (times >= lo) & (times < hi)
        if m.sum() == 0:
            continue
        p, y = probs[m], labels[m]
        conf = float(np.maximum(p, 1 - p).mean())
        print(f'{lo:>3}-{hi:<3} min | {m.sum():>6} | '
              f'{accuracy(p, y):>7.3f} | {ece(p, y, n_bins=10):>7.3f} | '
              f'{bce(p, y):>7.3f} | {conf:>7.3f} | {spread(p):>7.3f}')


def plot_reliability(probs, labels, ece_val,
                     out_path='reliability_logreg.png'):
    bins = np.linspace(0, 1, 16)
    idx = np.clip(np.digitize(probs, bins, right=True) - 1, 0, len(bins) - 2)
    centers, accs, counts = [], [], []
    for b in range(len(bins) - 1):
        m = idx == b
        if m.sum() < 5:
            continue
        centers.append(probs[m].mean())
        accs.append(labels[m].mean())
        counts.append(m.sum())

    plt.figure(figsize=(6, 6))
    plt.plot([0, 1], [0, 1], 'k--', label='perfect')
    plt.scatter(centers, accs,
                s=[c / max(counts) * 400 for c in counts],
                alpha=0.7, label='model')
    plt.xlabel('predicted P(win)')
    plt.ylabel('empirical win rate')
    plt.title(f'Reliability  |  ECE={ece_val:.4f}')
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=130)
    plt.close()
    print(f'Saved {out_path}')


def plot_distribution(probs, out_path='distribution_logreg.png'):
    plt.figure(figsize=(8, 5))
    sns.histplot(x=probs, kde=True, bins=15)
    plt.xlabel('Predicted P(blue wins)')
    plt.ylabel('Count')
    plt.title(f'Distribution of predicted P(win)  |  '
              f'spread={spread(probs):.4f}')
    plt.tight_layout()
    plt.savefig(out_path, dpi=130)
    plt.close()
    print(f'Saved {out_path}')


def main():
    # ---- Load single-state test set ----
    test_states = np.load(STATES_PATH)
    test_labels = np.load(LABELS_PATH)
    print(f'Test states: {len(test_states)} | shape={test_states.shape} | '
          f'feat_dim={test_states.shape[1]}')

    # ---- Load logistic regression checkpoint ----
    ckpt = joblib.load(CKPT_PATH)
    model       = ckpt['model']
    scaler      = ckpt['scaler']
    feature_cols = ckpt['feature_cols']
    n_features  = ckpt['n_features']

    # Sanity check: the checkpoint was trained on N numerical features
    # (columns 10..10+N). The test file must have the same layout.
    actual_num = test_states.shape[1] - 10
    if n_features != actual_num:
        raise ValueError(
            f'Model expects {n_features} numerical features (after the 10 '
            f'champion columns) but {STATES_PATH} has {actual_num}. '
            f'The feature layout of the test file does not match the '
            f'checkpoint.'
        )

    n_nonzero = int((np.abs(model.coef_) > 1e-8).sum())
    print(f'LR loaded | {n_nonzero}/{model.coef_.size} nonzero coefs | '
          f'intercept {model.intercept_[0]:.4f} | n_features={n_features}')

    # ---- Eval ----
    probs, labels, times = evaluate_all(
        model, scaler, feature_cols, test_states, test_labels, TIME_COL,
    )

    a = accuracy(probs, labels)
    e = ece(probs, labels)
    b = bce(probs, labels)
    s = spread(probs)

    print(f'\n=== Single-state evaluation (Logistic Regression) ===')
    print(f'Games evaluated: {len(labels)}')
    print(f'Accuracy:        {a:.4f}')
    print(f'ECE (15 bins):   {e:.4f}')
    print(f'BCE:             {b:.4f}')
    print(f'Spread:          {s:.4f}')

    print_by_minute(probs, labels, times)
    plot_reliability(probs, labels, e)
    plot_distribution(probs)

    np.savez('test_predictions_logreg.npz',
             probs=probs, labels=labels, times=times)
    print('Saved test_predictions_logreg.npz')


if __name__ == '__main__':
    main()