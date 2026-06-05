# IEEE-CIS Fraud Detection Dashboard

Pipeline Python modulaire et dashboard statique interactif pour analyser le
dataset IEEE-CIS Fraud Detection.

## Stack

- Python, Polars, pandas, scikit-learn pour l'analyse et les exports.
- Vite, React, TypeScript, ECharts pour la restitution interactive.
- GitHub Actions et GitHub Pages pour le deploiement statique.

## Structure

```txt
src/fraud_analysis/      # pipeline analyse, validation, exports, modele
web/src/                 # dashboard React
web/public/data/         # JSON statiques consommes par le dashboard
web/public/favicon.svg   # icone de l'onglet
data/raw/                # CSV Kaggle locaux, ignores par git
data/processed/          # Parquet normalises, ignores par git
data/dashboard/          # JSON canoniques, ignores par git
notebooks/               # exploration libre
reports/                 # exports et notes
```

Les fichiers lourds Kaggle restent locaux. Les seuls fichiers de donnees
necessaires au site public sont les agregats JSON dans `web/public/data/`.

## Experience publique

Le dashboard s'ouvre par defaut sur l'onglet `Decisions`, qui resume les
conclusions principales, les preuves et le plan d'action recommande.

Onglets utiles a partager :

```txt
#decisions    restitution executive
#overview     vue globale des volumes et du risque
#segments     exploration des segments a risque
#model        seuil, matrice de confusion, importance des variables
#methodology  methode, validation et limites
```

## Installation Python

Prerequis : Python 3.11+.

Windows PowerShell :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Linux / macOS :

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Generation des donnees dashboard

Les CSV Kaggle peuvent rester a la racine du projet ou etre places dans
`data/raw/`.

```powershell
python -m fraud_analysis validate --raw-dir .
python -m fraud_analysis prepare-processed --raw-dir . --out-dir data/processed
python -m fraud_analysis export-dashboard --raw-dir . --out-dir data/dashboard --publish-dir web/public/data
```

Le modele baseline est separe pour garder l'EDA rapide.

```powershell
python -m fraud_analysis train-model --raw-dir . --out-dir data/dashboard --publish-dir web/public/data
```

Les memes commandes sont exposees depuis la racine avec npm :

```bash
npm run data:validate
npm run data:prepare
npm run data:export
npm run model:train
```

## Dashboard local

Prerequis : Node.js 20+.

```powershell
cd web
npm install
npm run dev
```

Build statique :

```powershell
npm run build
npm run preview
```

Depuis la racine du projet, les equivalents sont :

```bash
npm run web:dev
npm run web:build
npm run web:preview
```

## Deploiement GitHub Pages

Le dashboard est pret pour GitHub Pages via le workflow
`.github/workflows/deploy-gh-pages.yml`.

Avant de pousser sur `main`, verifier que les JSON publics consommes par Vite
sont a jour :

```powershell
python -m fraud_analysis export-dashboard --raw-dir . --out-dir data/dashboard --publish-dir web/public/data
python -m fraud_analysis train-model --raw-dir . --out-dir data/dashboard --publish-dir web/public/data
```

Puis verifier le build localement :

```powershell
cd web
npm ci
npm run build
```

Dans GitHub, activer Pages avec la source `GitHub Actions` :

```txt
Settings > Pages > Build and deployment > Source: GitHub Actions
```

Chaque push sur `main` construit `web/dist` et le publie. Le dashboard utilise
des chemins relatifs (`base: "./"` dans Vite), donc il fonctionne sous
`https://<user>.github.io/<repo>/`.

Le fichier `web/public/.nojekyll` est inclus pour que GitHub Pages serve les
assets tels quels. Le site utilise des ancres (`#decisions`, `#overview`, etc.),
donc aucune regle serveur supplementaire n'est requise.
