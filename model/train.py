import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


CKPT_PATH = 'logreg.joblib'
BIN_PATH  = 'logreg.bin'


def evaluate(name, pipe, X, y):
    probs = pipe.predict_proba(X)[:, 1]
    acc = accuracy_score(y, (probs > 0.5).astype(np.int64))
    bce = log_loss(y, probs)
    print(f'{name:>5} | acc {acc:.4f} | bce {bce:.4f}')


def export_binary(pipe, path):
    """Write [means | stds | coef | intercept] as little-endian float64.

    Layout (n = n_features, 161 for the state-only model):
        offset 0*n .. 1*n : scaler means       (n float64)
        offset 1*n .. 2*n : scaler stds        (n float64)
        offset 2*n .. 3*n : logistic coefs     (n float64)
        offset 3*n .. 3*n+1: logistic intercept (1 float64)

    Little-endian is the native byte order on x86-64 / ARM64, so a C++
    reader can `fread` directly into a float64 buffer without swapping.
    Total file size = (3*n + 1) * 8 bytes.
    """
    scaler = pipe.named_steps['scaler']
    clf    = pipe.named_steps['logreg']

    means     = scaler.mean_.astype('<f8')
    stds      = scaler.scale_.astype('<f8')       # scale_ = std (or 1 for const cols)
    coefs     = clf.coef_.astype('<f8').ravel()   # shape (1, n) → (n,)
    intercept = clf.intercept_.astype('<f8')      # shape (1,)

    n = means.shape[0]
    assert stds.shape[0] == n
    assert coefs.shape[0] == n
    assert intercept.shape[0] == 1

    with open(path, 'wb') as f:
        f.write(means.tobytes())
        f.write(stds.tobytes())
        f.write(coefs.tobytes())
        f.write(intercept.tobytes())

    print(f'Saved {path} | n_features={n} | '
          f'{3 * n + 1} float64 | {(3 * n + 1) * 8} bytes')


def main():
    train_states = np.load('train_states.npy')
    train_labels = np.load('train_labels.npy')
    test_states = np.load('test_states.npy')
    test_labels = np.load('test_labels.npy')

    print(f'train states {train_states.shape} | '
          f'test states {test_states.shape}')

    X_train_full = train_states.astype(np.float64)
    y_train_full = train_labels.astype(np.int64)
    X_test = test_states.astype(np.float64)
    y_test = test_labels.astype(np.int64)

    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full,
        test_size=0.1, random_state=42, stratify=y_train_full,
    )
    print(f'train games = {len(X_train)} | val games = {len(X_val)} | '
          f'test games = {len(X_test)} | n_features = {X_train.shape[1]}')

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('logreg', LogisticRegression(
            C=1.0, solver='lbfgs', max_iter=1000, tol=1e-6,
        )),
    ])
    pipe.fit(X_train, y_train)

    clf = pipe.named_steps['logreg']
    n_nonzero = int((np.abs(clf.coef_) > 1e-8).sum())
    print(f'Model: {n_nonzero} nonzero coefficients of {clf.coef_.size} | '
          f'intercept {clf.intercept_[0]:.4f}')

    evaluate('train', pipe, X_train, y_train)
    evaluate('val', pipe, X_val, y_val)
    evaluate('test', pipe, X_test, y_test)

    joblib.dump(pipe, CKPT_PATH)
    print(f'Saved {CKPT_PATH}')

    export_binary(pipe, BIN_PATH)


if __name__ == '__main__':
    main()
