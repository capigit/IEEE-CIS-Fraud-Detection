from __future__ import annotations

from pathlib import Path

RAW_FILES = {
    "train_transaction": "train_transaction.csv",
    "train_identity": "train_identity.csv",
    "test_transaction": "test_transaction.csv",
    "test_identity": "test_identity.csv",
    "sample_submission": "sample_submission.csv",
}


def resolve_raw_dir(raw_dir: str | Path = ".") -> Path:
    """Return the directory that contains the Kaggle CSV files.

    The current project started with CSV files at the repository root. The same
    code also supports the cleaner data/raw layout without requiring edits.
    """

    base = Path(raw_dir).resolve()
    candidates = [base, base / "data" / "raw"]
    for candidate in candidates:
        if (candidate / RAW_FILES["train_transaction"]).exists():
            return candidate
    expected = " or ".join(str(candidate) for candidate in candidates)
    raise FileNotFoundError(f"Could not find raw CSV files in {expected}")


def raw_path(raw_dir: str | Path, key: str) -> Path:
    if key not in RAW_FILES:
        raise KeyError(f"Unknown raw file key: {key}")
    return resolve_raw_dir(raw_dir) / RAW_FILES[key]


def ensure_dir(path: str | Path) -> Path:
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target
