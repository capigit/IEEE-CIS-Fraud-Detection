from __future__ import annotations

from pathlib import Path
from typing import Any

from fraud_analysis.ingest import scan_identity, scan_transaction
from fraud_analysis.paths import ensure_dir


def export_processed_parquet(
    raw_dir: str | Path = ".",
    out_dir: str | Path = "data/processed",
) -> dict[str, Any]:
    """Create normalized parquet files for repeatable downstream analysis."""

    target_dir = ensure_dir(out_dir)
    outputs: dict[str, Any] = {}

    for split in ("train", "test"):
        transaction_path = target_dir / f"{split}_transaction.parquet"
        identity_path = target_dir / f"{split}_identity.parquet"

        scan_transaction(split, raw_dir).sink_parquet(transaction_path)
        scan_identity(split, raw_dir).sink_parquet(identity_path)

        outputs[f"{split}_transaction"] = {
            "path": str(transaction_path),
            "size_mb": round(transaction_path.stat().st_size / 1024 / 1024, 2),
        }
        outputs[f"{split}_identity"] = {
            "path": str(identity_path),
            "size_mb": round(identity_path.stat().st_size / 1024 / 1024, 2),
        }

    return {"out_dir": str(target_dir), "files": outputs}
