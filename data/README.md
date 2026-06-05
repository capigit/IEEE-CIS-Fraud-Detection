# Organisation des donnees

Les donnees brutes proviennent de la competition Kaggle
[IEEE-CIS Fraud Detection](https://www.kaggle.com/competitions/ieee-fraud-detection/data).

Organisation locale recommandee :

```txt
data/
  raw/          # CSV Kaggle, ignores par git
  processed/    # Parquet normalises ou artefacts intermediaires
  dashboard/    # Exports JSON canoniques pour le dashboard
```

Les scripts acceptent aussi les CSV places directement a la racine du projet.
Dans les deux cas, utiliser `--raw-dir .`.

Les donnees brutes et les exports intermediaires restent locaux. Seuls les
agregats publics copies dans `web/public/data/` sont versionnes pour GitHub
Pages.
