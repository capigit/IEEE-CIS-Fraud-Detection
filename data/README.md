# Data layout

Recommended local layout:

```txt
data/
  raw/          # Kaggle CSV files, ignored by git
  processed/    # Parquet or model artifacts
  dashboard/    # Optional intermediate exports
```

The current scripts also support the existing CSV files at the project root.
Use `--raw-dir .` in both cases.
