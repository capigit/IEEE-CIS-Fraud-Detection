from __future__ import annotations

IDENTITY_PREFIX = "id_"


def normalize_identity_name(name: str) -> str:
    """Normalize Kaggle test identity columns from id-01 to id_01."""

    if name.startswith("id-"):
        return name.replace("id-", "id_", 1)
    return name


def normalize_identity_columns(columns: list[str]) -> list[str]:
    return [normalize_identity_name(column) for column in columns]


def identity_rename_map(columns: list[str]) -> dict[str, str]:
    return {
        column: normalize_identity_name(column)
        for column in columns
        if normalize_identity_name(column) != column
    }


def transaction_column_groups(columns: list[str]) -> dict[str, list[str]]:
    return {
        "card": [column for column in columns if column.startswith("card")],
        "addr": [column for column in columns if column.startswith("addr")],
        "dist": [column for column in columns if column.startswith("dist")],
        "C": [column for column in columns if column.startswith("C") and column[1:].isdigit()],
        "D": [column for column in columns if column.startswith("D") and column[1:].isdigit()],
        "M": [column for column in columns if column.startswith("M") and column[1:].isdigit()],
        "V": [column for column in columns if column.startswith("V") and column[1:].isdigit()],
    }
