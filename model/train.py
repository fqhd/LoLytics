import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


CKPT_PATH = 'logreg.joblib'


def evaluate(name, clf, X, y):
    probs = clf.predict_proba(X)[:, 1]
    acc = accuracy_score(y, (probs > 0.5).astype(np.int64))
    bce = log_loss(y, probs)
    print(f'{name:>5} | acc {acc:.4f} | bce {bce:.4f}')
    return acc, bce


def main():
    # ---- Load the single-state dataset ----
    train_states = np.load('train_states.npy')
    train_labels = np.load('train_labels.npy')
    test_states  = np.load('test_states.npy')
    test_labels  = np.load('test_labels.npy')

    print(f'train states {train_states.shape} | '
          f'test states {test_states.shape}')

    # ---- Drop the first 10 columns (champion indices) ----
    # Columns 0..9  = champion picks (ignored — LR needs one-hot to use them)
    # Columns 10..  = numerical features (the only ones used)
    X_train_full = train_states[:, 10:].astype(np.float64)
    y_train_full = train_labels.astype(np.int64)
    X_test       = test_states[:, 10:].astype(np.float64)
    y_test       = test_labels.astype(np.int64)

    # ---- 90/10 train/val split (same seed as the DNN script) ----
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full,
        test_size=0.1, random_state=42, stratify=y_train_full,
    )
    print(f'train games = {len(X_train)} | val games = {len(X_val)} | '
          f'test games = {len(X_test)} | n_features = {X_train.shape[1]}')

    # ---- Standardize (fit on train only) ----
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s   = scaler.transform(X_val)
    X_test_s  = scaler.transform(X_test)

    # ---- Logistic regression ----
    clf = LogisticRegression(
        C=1.0,
        solver='lbfgs',
        max_iter=1000,
        tol=1e-6,
    )
    clf.fit(X_train_s, y_train)

    n_nonzero = int((np.abs(clf.coef_) > 1e-8).sum())
    print(f'Model: {n_nonzero} nonzero coefficients out of '
          f'{clf.coef_.size} | intercept {clf.intercept_[0]:.4f}')

    # ---- Evaluate ----
    evaluate('train', clf, X_train_s, y_train)
    evaluate('val',   clf, X_val_s,   y_val)
    evaluate('test',  clf, X_test_s,  y_test)

    # ---- Save checkpoint ----
    # Load later with:
    #   ckpt = joblib.load('logreg.joblib')
    #   clf, scaler = ckpt['model'], ckpt['scaler']
    #   probs = clf.predict_proba(
    #       scaler.transform(X[:, ckpt['feature_cols']])
    #   )[:, 1]
    joblib.dump({
        'model':        clf,
        'scaler':       scaler,
        'feature_cols': list(range(10, train_states.shape[1])),
        'ignored_cols': list(range(10)),
        'n_features':   X_train.shape[1],
    }, CKPT_PATH)
    print(f'Saved {CKPT_PATH}')


if __name__ == '__main__':
    main()