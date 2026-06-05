from __future__ import annotations

from pathlib import Path

import polars as pl

from fraud_analysis.paths import raw_path
from fraud_analysis.schema import identity_rename_map


def scan_transaction(split: str, raw_dir: str | Path = ".") -> pl.LazyFrame:
    if split not in {"train", "test"}:
        raise ValueError("split must be 'train' or 'test'")
    return pl.scan_csv(raw_path(raw_dir, f"{split}_transaction"))


def scan_identity(split: str, raw_dir: str | Path = ".") -> pl.LazyFrame:
    if split not in {"train", "test"}:
        raise ValueError("split must be 'train' or 'test'")
    frame = pl.scan_csv(raw_path(raw_dir, f"{split}_identity"))
    rename_map = identity_rename_map(frame.collect_schema().names())
    return frame.rename(rename_map) if rename_map else frame


def read_selected_transaction(
    split: str,
    columns: list[str],
    raw_dir: str | Path = ".",
) -> pl.DataFrame:
    return scan_transaction(split, raw_dir).select(columns).collect()
