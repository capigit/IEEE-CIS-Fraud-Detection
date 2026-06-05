from __future__ import annotations

from pathlib import Path
from typing import Any

import polars as pl

from fraud_analysis.ingest import scan_identity, scan_transaction
from fraud_analysis.paths import RAW_FILES, resolve_raw_dir
from fraud_analysis.schema import normalize_identity_columns, transaction_column_groups


def _row_count(path: Path) -> int:
    return pl.scan_csv(path).select(pl.len().alias("rows")).collect().item()


def validate_raw_data(raw_dir: str | Path = ".") -> dict[str, Any]:
    root = resolve_raw_dir(raw_dir)
    files = {}
    for key, filename in RAW_FILES.items():
        path = root / filename
        files[key] = {
            "path": str(path),
            "exists": path.exists(),
            "size_mb": round(path.stat().st_size / 1024 / 1024, 2) if path.exists() else None,
            "rows": _row_count(path) if path.exists() else None,
        }

    train_transaction_cols = scan_transaction("train", root).collect_schema().names()
    test_transaction_cols = scan_transaction("test", root).collect_schema().names()
    train_identity_cols = scan_identity("train", root).collect_schema().names()
    test_identity_cols_raw = pl.scan_csv(root / RAW_FILES["test_identity"]).collect_schema().names()
    test_identity_cols = normalize_identity_columns(test_identity_cols_raw)

    return {
        "raw_dir": str(root),
        "files": files,
        "transaction": {
            "train_columns": len(train_transaction_cols),
            "test_columns": len(test_transaction_cols),
            "train_only": sorted(set(train_transaction_cols) - set(test_transaction_cols)),
            "test_only": sorted(set(test_transaction_cols) - set(train_transaction_cols)),
            "groups": {
                key: len(value)
                for key, value in transaction_column_groups(train_transaction_cols).items()
            },
        },
        "identity": {
            "train_columns": len(train_identity_cols),
            "test_columns": len(test_identity_cols),
            "normalized_columns_match": train_identity_cols == test_identity_cols,
            "test_columns_with_dash": sum(
                column.startswith("id-") for column in test_identity_cols_raw
            ),
        },
    }
