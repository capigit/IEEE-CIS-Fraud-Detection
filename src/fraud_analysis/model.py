from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from fraud_analysis.export_dashboard import publish_dashboard_files
from fraud_analysis.paths import ensure_dir, raw_path

NUMERIC_FEATURES = [
    "TransactionAmt",
    "dist1",
    "dist2",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
    "C9",
    "C10",
    "C11",
    "C12",
    "C13",
    "C14",
]

CATEGORICAL_FEATURES = [
    "ProductCD",
    "card4",
    "card6",
    "P_emaildomain",
    "R_emaildomain",
    "M1",
    "M2",
    "M3",
    "M4",
    "M5",
    "M6",
    "M7",
    "M8",
    "M9",
]


def _best_threshold(y_true: np.ndarray, probabilities: np.ndarray) -> dict[str, Any]:
    precision, recall, thresholds = precision_recall_curve(y_true, probabilities)
    f1 = (2 * precision * recall) / np.maximum(precision + recall, 1e-12)
    index = int(np.nanargmax(f1))
    threshold = float(thresholds[max(index - 1, 0)]) if len(thresholds) else 0.5
    return {
        "threshold": round(threshold, 6),
        "precision": round(float(precision[index]), 6),
        "recall": round(float(recall[index]), 6),
        "f1": round(float(f1[index]), 6),
    }


def _threshold_scenarios(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    best_threshold: float,
) -> list[dict[str, Any]]:
    thresholds = sorted({*np.round(np.linspace(0.05, 0.95, 19), 3), round(best_threshold, 3)})
    scenarios: list[dict[str, Any]] = []

    for threshold in thresholds:
        predictions = (probabilities >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
        precision = tp / (tp + fp) if tp + fp else 0
        recall = tp / (tp + fn) if tp + fn else 0
        f1 = (2 * precision * recall) / (precision + recall) if precision + recall else 0
        flagged = int(tp + fp)

        scenarios.append(
            {
                "threshold": round(float(threshold), 3),
                "precision": round(float(precision), 6),
                "recall": round(float(recall), 6),
                "f1": round(float(f1), 6),
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
                "flagged_count": flagged,
                "flagged_rate": round(flagged / len(y_true), 6),
            }
        )

    return scenarios


def _base_feature_name(encoded_name: str) -> str:
    name = encoded_name.split("__", 1)[-1]
    if name in NUMERIC_FEATURES:
        return name

    for feature in sorted(CATEGORICAL_FEATURES, key=len, reverse=True):
        if name == feature or name.startswith(f"{feature}_"):
            return feature

    return name


def _feature_importance(pipeline: Pipeline) -> dict[str, list[dict[str, Any]]]:
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocess"]
    classifier: LogisticRegression = pipeline.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()
    coefficients = classifier.coef_[0]

    encoded_rows = [
        {
            "feature": str(feature),
            "base_feature": _base_feature_name(str(feature)),
            "coefficient": round(float(coefficient), 6),
            "importance": round(float(abs(coefficient)), 6),
            "direction": "risk_up" if coefficient >= 0 else "risk_down",
        }
        for feature, coefficient in zip(feature_names, coefficients, strict=True)
    ]
    encoded_top = sorted(encoded_rows, key=lambda row: row["importance"], reverse=True)[:20]

    grouped: dict[str, dict[str, Any]] = {}
    for row in encoded_rows:
        base = row["base_feature"]
        item = grouped.setdefault(
            base,
            {
                "feature": base,
                "importance": 0.0,
                "max_abs_coefficient": 0.0,
                "encoded_count": 0,
            },
        )
        item["importance"] += row["importance"]
        item["max_abs_coefficient"] = max(item["max_abs_coefficient"], row["importance"])
        item["encoded_count"] += 1

    grouped_rows = [
        {
            "feature": row["feature"],
            "importance": round(float(row["importance"]), 6),
            "max_abs_coefficient": round(float(row["max_abs_coefficient"]), 6),
            "encoded_count": int(row["encoded_count"]),
        }
        for row in grouped.values()
    ]
    grouped_top = sorted(grouped_rows, key=lambda row: row["importance"], reverse=True)[:15]

    return {"encoded_top": encoded_top, "grouped_top": grouped_top}


def train_time_split_baseline(
    raw_dir: str | Path = ".",
    out_dir: str | Path = "data/dashboard",
    publish_dir: str | Path | None = "web/public/data",
    validation_fraction: float = 0.2,
) -> dict[str, Any]:
    """Train a compact, reproducible baseline for dashboard reporting."""

    columns = ["TransactionDT", "isFraud", *NUMERIC_FEATURES, *CATEGORICAL_FEATURES]
    data = pd.read_csv(raw_path(raw_dir, "train_transaction"), usecols=columns)
    data = data.sort_values("TransactionDT")

    split_index = int(len(data) * (1 - validation_fraction))
    train = data.iloc[:split_index]
    valid = data.iloc[split_index:]

    X_train = train[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y_train = train["isFraud"].to_numpy()
    X_valid = valid[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y_valid = valid["isFraud"].to_numpy()

    categorical_encoder = OneHotEncoder(handle_unknown="ignore", max_categories=50)
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                NUMERIC_FEATURES,
            ),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                        ("onehot", categorical_encoder),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    classifier = LogisticRegression(
        class_weight="balanced",
        max_iter=500,
        solver="lbfgs",
    )
    pipeline = Pipeline([("preprocess", preprocessor), ("classifier", classifier)])
    pipeline.fit(X_train, y_train)

    probabilities = pipeline.predict_proba(X_valid)[:, 1]
    best = _best_threshold(y_valid, probabilities)
    predictions = (probabilities >= best["threshold"]).astype(int)
    matrix = confusion_matrix(y_valid, predictions, labels=[0, 1]).tolist()
    threshold_scenarios = _threshold_scenarios(y_valid, probabilities, best["threshold"])
    feature_importance = _feature_importance(pipeline)

    payload = {
        "status": "trained",
        "model_name": "time_split_logistic_regression",
        "validation": {
            "strategy": "last_20_percent_by_TransactionDT",
            "rows_train": int(len(train)),
            "rows_valid": int(len(valid)),
            "fraud_rate_valid": round(float(y_valid.mean()), 6),
        },
        "metrics": {
            "roc_auc": round(float(roc_auc_score(y_valid, probabilities)), 6),
            "average_precision": round(float(average_precision_score(y_valid, probabilities)), 6),
            "best_threshold": best,
            "confusion_matrix": {
                "labels": ["not_fraud", "fraud"],
                "matrix": matrix,
            },
            "threshold_scenarios": threshold_scenarios,
        },
        "features": {
            "numeric": NUMERIC_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "importance": feature_importance,
        },
    }

    target_dir = ensure_dir(out_dir)
    (target_dir / "model.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if publish_dir:
        publish_dashboard_files(target_dir, publish_dir)
    return payload
