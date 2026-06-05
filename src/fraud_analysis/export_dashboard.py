from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fraud_analysis.eda import build_dashboard_payload
from fraud_analysis.paths import ensure_dir


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def publish_dashboard_files(
    source_dir: str | Path = "data/dashboard",
    publish_dir: str | Path = "web/public/data",
) -> list[str]:
    source = Path(source_dir)
    target = ensure_dir(publish_dir)
    published: list[str] = []

    if source.resolve() == target.resolve():
        return published

    for filename in ("overview.json", "eda.json", "model.json"):
        source_file = source / filename
        if source_file.exists():
            destination = target / filename
            shutil.copy2(source_file, destination)
            published.append(str(destination))

    return published


def export_dashboard_data(
    raw_dir: str | Path = ".",
    out_dir: str | Path = "data/dashboard",
    publish_dir: str | Path | None = "web/public/data",
) -> dict[str, Any]:
    target_dir = ensure_dir(out_dir)
    payload = build_dashboard_payload(raw_dir)
    generated_at = datetime.now(UTC).isoformat()

    overview = {"generated_at": generated_at, **payload["overview"]}
    eda = {"generated_at": generated_at, **payload["eda"]}
    model_path = target_dir / "model.json"

    _write_json(target_dir / "overview.json", overview)
    _write_json(target_dir / "eda.json", eda)

    if not model_path.exists():
        _write_json(
            model_path,
            {
                "generated_at": generated_at,
                "status": "not_trained",
                "model_name": None,
                "validation": None,
                "metrics": None,
                "features": None,
            },
        )

    published = publish_dashboard_files(target_dir, publish_dir) if publish_dir else []

    return {
        "overview": overview,
        "eda": eda,
        "model_path": str(model_path),
        "published": published,
    }
