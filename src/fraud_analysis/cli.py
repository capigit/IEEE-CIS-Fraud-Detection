from __future__ import annotations

import argparse
import json
from pathlib import Path

from fraud_analysis.export_dashboard import export_dashboard_data
from fraud_analysis.model import train_time_split_baseline
from fraud_analysis.processed import export_processed_parquet
from fraud_analysis.validate import validate_raw_data


def _print_json(payload: object) -> None:
    print(json.dumps(payload, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="fraud-analysis")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="Validate raw IEEE-CIS CSV files.")
    validate.add_argument("--raw-dir", default=".", help="Directory containing raw CSV files.")

    processed = subparsers.add_parser(
        "prepare-processed",
        help="Export normalized parquet files to data/processed.",
    )
    processed.add_argument("--raw-dir", default=".", help="Directory containing raw CSV files.")
    processed.add_argument(
        "--out-dir",
        default="data/processed",
        help="Output directory for parquet files.",
    )

    export = subparsers.add_parser(
        "export-dashboard",
        help="Export static JSON data for the web app.",
    )
    export.add_argument("--raw-dir", default=".", help="Directory containing raw CSV files.")
    export.add_argument(
        "--out-dir",
        default="data/dashboard",
        help="Output directory for JSON files.",
    )
    export.add_argument(
        "--publish-dir",
        default="web/public/data",
        help="Optional directory mirrored for the static web app.",
    )

    model = subparsers.add_parser(
        "train-model",
        help="Train the baseline model and export model.json.",
    )
    model.add_argument("--raw-dir", default=".", help="Directory containing raw CSV files.")
    model.add_argument(
        "--out-dir",
        default="data/dashboard",
        help="Output directory for model.json.",
    )
    model.add_argument(
        "--publish-dir",
        default="web/public/data",
        help="Optional directory mirrored for the static web app.",
    )
    model.add_argument(
        "--validation-fraction",
        type=float,
        default=0.2,
        help="Tail fraction of time-ordered train data used for validation.",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "validate":
        _print_json(validate_raw_data(Path(args.raw_dir)))
        return 0

    if args.command == "prepare-processed":
        _print_json(export_processed_parquet(Path(args.raw_dir), Path(args.out_dir)))
        return 0

    if args.command == "export-dashboard":
        export_dashboard_data(Path(args.raw_dir), Path(args.out_dir), Path(args.publish_dir))
        print(f"Dashboard data exported to {args.out_dir} and mirrored to {args.publish_dir}")
        return 0

    if args.command == "train-model":
        train_time_split_baseline(
            raw_dir=Path(args.raw_dir),
            out_dir=Path(args.out_dir),
            publish_dir=Path(args.publish_dir),
            validation_fraction=args.validation_fraction,
        )
        print(
            f"Model report exported to {args.out_dir}/model.json "
            f"and mirrored to {args.publish_dir}"
        )
        return 0

    parser.error(f"Unknown command: {args.command}")
    return 2
