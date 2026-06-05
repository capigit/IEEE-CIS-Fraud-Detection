from __future__ import annotations

from pathlib import Path
from typing import Any

import polars as pl

from fraud_analysis.ingest import scan_identity, scan_transaction
from fraud_analysis.schema import transaction_column_groups

SECONDS_PER_DAY = 86_400


def _clean_value(value: Any) -> str:
    if value is None:
        return "NA"
    return str(value)


def _collect_one(frame: pl.LazyFrame) -> dict[str, Any]:
    rows = frame.collect().to_dicts()
    return rows[0] if rows else {}


def _missingness(frame: pl.LazyFrame, limit: int = 30) -> list[dict[str, Any]]:
    columns = frame.collect_schema().names()
    total = frame.select(pl.len().alias("rows")).collect().item()
    counts = frame.select(
        [pl.col(column).is_null().sum().alias(column) for column in columns]
    ).collect()
    row = counts.to_dicts()[0]
    result = [
        {
            "column": column,
            "missing": int(missing),
            "missing_pct": round(float(missing) / total, 6) if total else 0,
        }
        for column, missing in row.items()
    ]
    return sorted(result, key=lambda item: item["missing_pct"], reverse=True)[:limit]


def _group_fraud(frame: pl.LazyFrame, column: str, limit: int = 20) -> list[dict[str, Any]]:
    rows = (
        frame.group_by(column)
        .agg(
            pl.len().alias("count"),
            pl.col("isFraud").sum().alias("fraud_count"),
        )
        .with_columns((pl.col("fraud_count") / pl.col("count")).alias("fraud_rate"))
        .sort("count", descending=True)
        .limit(limit)
        .collect()
        .to_dicts()
    )
    return [
        {
            "value": _clean_value(row[column]),
            "count": int(row["count"]),
            "fraud_count": int(row["fraud_count"]),
            "fraud_rate": round(float(row["fraud_rate"]), 6),
        }
        for row in rows
    ]


def _day_timeline(frame: pl.LazyFrame) -> list[dict[str, Any]]:
    rows = (
        frame.with_columns(
            (pl.col("TransactionDT") / SECONDS_PER_DAY).floor().cast(pl.Int32).alias("day")
        )
        .group_by("day")
        .agg(pl.len().alias("count"), pl.col("isFraud").sum().alias("fraud_count"))
        .with_columns((pl.col("fraud_count") / pl.col("count")).alias("fraud_rate"))
        .sort("day")
        .collect()
        .to_dicts()
    )
    return [
        {
            "day": int(row["day"]),
            "count": int(row["count"]),
            "fraud_count": int(row["fraud_count"]),
            "fraud_rate": round(float(row["fraud_rate"]), 6),
        }
        for row in rows
    ]


def _amount_quantiles(frame: pl.LazyFrame) -> dict[str, float]:
    quantiles = [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1]
    row = _collect_one(
        frame.select(
            [
                pl.col("TransactionAmt").quantile(q).alias(f"q{str(q).replace('.', '_')}")
                for q in quantiles
            ]
        )
    )
    return {key: round(float(value), 4) for key, value in row.items()}


def _amount_bands(frame: pl.LazyFrame) -> list[dict[str, Any]]:
    bands = [
        ("0-10", 0, 10),
        ("10-25", 10, 25),
        ("25-50", 25, 50),
        ("50-100", 50, 100),
        ("100-250", 100, 250),
        ("250-500", 250, 500),
        ("500-1000", 500, 1000),
        ("1000+", 1000, None),
    ]
    rows: list[dict[str, Any]] = []
    for label, lower, upper in bands:
        condition = pl.col("TransactionAmt") >= lower
        if upper is not None:
            condition = condition & (pl.col("TransactionAmt") < upper)
        item = _collect_one(
            frame.filter(condition).select(
                pl.len().alias("count"),
                pl.col("isFraud").sum().alias("fraud_count"),
            )
        )
        count = int(item.get("count", 0))
        fraud_count = int(item.get("fraud_count", 0) or 0)
        rows.append(
            {
                "value": label,
                "count": count,
                "fraud_count": fraud_count,
                "fraud_rate": round(fraud_count / count, 6) if count else 0,
            }
        )
    return rows


def build_dashboard_payload(raw_dir: str | Path = ".") -> dict[str, Any]:
    train_transaction = scan_transaction("train", raw_dir)
    test_transaction = scan_transaction("test", raw_dir)
    train_identity = scan_identity("train", raw_dir)
    test_identity = scan_identity("test", raw_dir)

    train_cols = train_transaction.collect_schema().names()
    test_cols = test_transaction.collect_schema().names()
    train_identity_cols = train_identity.collect_schema().names()

    train_summary = _collect_one(
        train_transaction.select(
            pl.len().alias("rows"),
            pl.col("isFraud").sum().alias("fraud_count"),
            pl.col("TransactionDT").min().alias("dt_min"),
            pl.col("TransactionDT").max().alias("dt_max"),
        )
    )
    test_summary = _collect_one(
        test_transaction.select(
            pl.len().alias("rows"),
            pl.col("TransactionDT").min().alias("dt_min"),
            pl.col("TransactionDT").max().alias("dt_max"),
        )
    )
    train_identity_rows = train_identity.select(pl.len().alias("rows")).collect().item()
    test_identity_rows = test_identity.select(pl.len().alias("rows")).collect().item()

    train_rows = int(train_summary["rows"])
    fraud_count = int(train_summary["fraud_count"])
    test_rows = int(test_summary["rows"])
    train_dt_min = int(train_summary["dt_min"])
    train_dt_max = int(train_summary["dt_max"])
    test_dt_min = int(test_summary["dt_min"])
    test_dt_max = int(test_summary["dt_max"])

    overview = {
        "files": {
            "train_transaction": {"rows": train_rows, "columns": len(train_cols)},
            "test_transaction": {"rows": test_rows, "columns": len(test_cols)},
            "train_identity": {
                "rows": int(train_identity_rows),
                "columns": len(train_identity_cols),
            },
            "test_identity": {
                "rows": int(test_identity_rows),
                "columns": len(test_identity.collect_schema().names()),
            },
        },
        "target": {
            "fraud_count": fraud_count,
            "non_fraud_count": train_rows - fraud_count,
            "fraud_rate": round(fraud_count / train_rows, 6),
        },
        "time": {
            "train_dt_min": train_dt_min,
            "train_dt_max": train_dt_max,
            "train_span_days": round((train_dt_max - train_dt_min) / SECONDS_PER_DAY, 2),
            "test_dt_min": test_dt_min,
            "test_dt_max": test_dt_max,
            "test_span_days": round((test_dt_max - test_dt_min) / SECONDS_PER_DAY, 2),
            "gap_days": round((test_dt_min - train_dt_max) / SECONDS_PER_DAY, 2),
        },
        "identity": {
            "train_coverage": round(train_identity_rows / train_rows, 6),
            "test_coverage": round(test_identity_rows / test_rows, 6),
        },
        "schema": {
            "transaction_train_only": sorted(set(train_cols) - set(test_cols)),
            "transaction_test_only": sorted(set(test_cols) - set(train_cols)),
            "transaction_groups": {
                key: len(value) for key, value in transaction_column_groups(train_cols).items()
            },
        },
    }

    eda = {
        "groups": {
            "ProductCD": _group_fraud(train_transaction, "ProductCD", 10),
            "card4": _group_fraud(train_transaction, "card4", 10),
            "card6": _group_fraud(train_transaction, "card6", 10),
            "P_emaildomain": _group_fraud(train_transaction, "P_emaildomain", 15),
            "R_emaildomain": _group_fraud(train_transaction, "R_emaildomain", 15),
            "DeviceType": _group_fraud(
                train_transaction.join(train_identity, on="TransactionID", how="left"),
                "DeviceType",
                10,
            ),
            "amount_bands": _amount_bands(train_transaction),
        },
        "amount_quantiles": _amount_quantiles(train_transaction),
        "timeline": _day_timeline(train_transaction),
        "missingness": {
            "train_transaction": _missingness(train_transaction, 30),
            "train_identity": _missingness(train_identity, 30),
        },
    }

    return {"overview": overview, "eda": eda}
