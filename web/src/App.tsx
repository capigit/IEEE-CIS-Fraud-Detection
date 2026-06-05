import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Database,
  Gauge,
  Info,
  Layers,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Target
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EChart } from "./charts/EChart";
import {
  confusionOption,
  countBarOption,
  featureImportanceOption,
  missingnessOption,
  rateBarOption,
  thresholdScenarioOption,
  timelineOption
} from "./charts/options";
import { DataTable } from "./components/DataTable";
import { MetricCard } from "./components/MetricCard";
import { loadDashboardData } from "./lib/data";
import {
  formatDecimal,
  formatGeneratedAt,
  formatInteger,
  formatPercent
} from "./lib/format";
import type { DashboardData, FeatureImportanceRow, GroupRow, ThresholdScenario } from "./types";

type TabId = "decisions" | "overview" | "eda" | "missingness" | "model" | "methodology";

const tabs: Array<{ id: TabId; label: string; icon: typeof Activity }> = [
  { id: "decisions", label: "Decisions", icon: Target },
  { id: "overview", label: "Vue globale", icon: Activity },
  { id: "eda", label: "Segments", icon: BarChart3 },
  { id: "missingness", label: "Donnees", icon: Database },
  { id: "model", label: "Modele", icon: Gauge },
  { id: "methodology", label: "Methode", icon: BookOpen }
];

const hashAliases: Record<string, TabId> = {
  segments: "eda",
  qualite: "missingness",
  donnees: "missingness",
  method: "methodology",
  methode: "methodology"
};

function tabFromHash(): TabId {
  const hash = window.location.hash.replace("#", "");
  if (hashAliases[hash]) return hashAliases[hash];
  return tabs.some((item) => item.id === hash) ? (hash as TabId) : "decisions";
}

export function App() {
  const [tab, setTab] = useState<TabId>(() => tabFromHash());
  const [data, setData] = useState<DashboardData | null>(null);
  const [source, setSource] = useState<"static" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await loadDashboardData();
    setData(result.data);
    setSource(result.source);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const nextHash = `#${tab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }, [tab]);

  const generatedAt =
    data?.overview.generated_at ?? data?.eda.generated_at ?? data?.model.generated_at;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <ShieldAlert aria-hidden="true" />
          <div>
            <span>IEEE-CIS</span>
            <h1>Fraud Analytics</h1>
          </div>
        </div>
        <div className="header-actions">
          <div className={`source-pill source-pill--${source}`}>
            {source === "static" ? "donnees pretes" : "mode demo"}
          </div>
          <button className="icon-button" type="button" onClick={refresh} title="Actualiser">
            <RefreshCw aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Navigation principale">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              type="button"
              onClick={() => {
                setTab(item.id);
                window.history.replaceState(null, "", `#${item.id}`);
              }}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main>
        {loading || !data ? (
          <section className="loading-panel">
            <SlidersHorizontal aria-hidden="true" />
            <span>Chargement</span>
          </section>
        ) : (
          <>
            <div className="meta-row">
              <span>Generation : {formatGeneratedAt(generatedAt)}</span>
              <span>
                Train/Test : {formatInteger(data.overview.files.train_transaction.rows)} /{" "}
                {formatInteger(data.overview.files.test_transaction.rows)}
              </span>
            </div>
            {tab === "overview" ? <OverviewView data={data} /> : null}
            {tab === "eda" ? <EdaView data={data} /> : null}
            {tab === "missingness" ? <MissingnessView data={data} /> : null}
            {tab === "model" ? <ModelView data={data} /> : null}
            {tab === "decisions" ? <DecisionsView data={data} /> : null}
            {tab === "methodology" ? <MethodologyView data={data} /> : null}
          </>
        )}
      </main>
    </div>
  );
}

function OverviewView({ data }: { data: DashboardData }) {
  const { overview, eda } = data;
  const topProduct = getTopRisk(eda.groups.ProductCD ?? []);
  const peakDay = eda.timeline.reduce(
    (best, row) => (row.fraud_rate > best.fraud_rate ? row : best),
    eda.timeline[0] ?? { day: 0, fraud_rate: 0, count: 0, fraud_count: 0 }
  );
  const groupBars = useMemo(
    () =>
      Object.entries(overview.schema.transaction_groups).map(([value, count]) => ({
        value,
        count,
        fraud_count: 0,
        fraud_rate: 0
      })),
    [overview.schema.transaction_groups]
  );

  return (
    <>
      <InsightStrip
        items={[
          {
            icon: AlertTriangle,
            label: "Cible rare",
            value: formatPercent(overview.target.fraud_rate),
            detail: `1 fraude pour ${formatDecimal(1 / overview.target.fraud_rate, 0)} transactions environ`
          },
          {
            icon: Target,
            label: "Segment prioritaire",
            value: topProduct?.value ?? "NA",
            detail: `${formatPercent(topProduct?.fraud_rate ?? 0)} soit ${formatDecimal(
              (topProduct?.fraud_rate ?? 0) / overview.target.fraud_rate,
              1
            )}x le taux global`
          },
          {
            icon: Activity,
            label: "Pic temporel",
            value: `J${peakDay.day}`,
            detail: `${formatPercent(peakDay.fraud_rate)} sur ${formatInteger(peakDay.count)} transactions`
          },
          {
            icon: Info,
            label: "Identity partiel",
            value: formatPercent(overview.identity.train_coverage),
            detail: "signal utile, mais absent sur la majorite du train"
          }
        ]}
      />

      <section className="metric-grid">
        <MetricCard
          label="Taux de fraude"
          value={formatPercent(overview.target.fraud_rate)}
          detail={`${formatInteger(overview.target.fraud_count)} fraudes`}
          tone="coral"
        />
        <MetricCard
          label="Transactions train"
          value={formatInteger(overview.files.train_transaction.rows)}
          detail={`${overview.files.train_transaction.columns} colonnes`}
          tone="teal"
        />
        <MetricCard
          label="Transactions test"
          value={formatInteger(overview.files.test_transaction.rows)}
          detail={`${overview.files.test_transaction.columns} colonnes`}
          tone="blue"
        />
        <MetricCard
          label="Couverture identity"
          value={formatPercent(overview.identity.train_coverage)}
          detail={`test ${formatPercent(overview.identity.test_coverage)}`}
          tone="green"
        />
        <MetricCard
          label="Fenetre train"
          value={`${formatDecimal(overview.time.train_span_days, 0)} j`}
          detail={`gap ${formatDecimal(overview.time.gap_days, 0)} j`}
          tone="amber"
        />
      </section>

      <section className="panel-grid panel-grid--wide">
        <div className="visual-panel">
          <EChart option={timelineOption(eda.timeline)} height={330} />
        </div>
        <div className="visual-panel">
          <EChart
            option={rateBarOption(
              eda.groups.ProductCD ?? [],
              "Produit transactionnel",
              "#cf4d3f"
            )}
            height={330}
          />
        </div>
        <div className="visual-panel">
          <EChart option={countBarOption(groupBars, "Groupes de colonnes", "#3157b7")} height={300} />
        </div>
      </section>
    </>
  );
}

function EdaView({ data }: { data: DashboardData }) {
  const groups = data.eda.groups;
  const topProduct = getTopRisk(groups.ProductCD ?? []);
  const topCard = getTopRisk(groups.card4 ?? []);
  const credit = groups.card6?.find((row) => row.value === "credit");
  const debit = groups.card6?.find((row) => row.value === "debit");
  const topAmount = getTopRisk(groups.amount_bands ?? []);
  const creditLift = credit && debit ? credit.fraud_rate / debit.fraud_rate : 0;

  return (
    <>
      <InsightStrip
        items={[
          {
            icon: Target,
            label: "Produit a surveiller",
            value: topProduct?.value ?? "NA",
            detail: `${formatPercent(topProduct?.fraud_rate ?? 0)} de fraude`
          },
          {
            icon: AlertTriangle,
            label: "Carte la plus risquee",
            value: topCard?.value ?? "NA",
            detail: `${formatPercent(topCard?.fraud_rate ?? 0)} de fraude`
          },
          {
            icon: Activity,
            label: "Credit vs debit",
            value: `${formatDecimal(creditLift, 1)}x`,
            detail: `${formatPercent(credit?.fraud_rate ?? 0)} contre ${formatPercent(
              debit?.fraud_rate ?? 0
            )}`
          },
          {
            icon: Info,
            label: "Montant sensible",
            value: topAmount?.value ?? "NA",
            detail: `${formatPercent(topAmount?.fraud_rate ?? 0)} de fraude`
          }
        ]}
      />

      <section className="panel-grid">
        <div className="visual-panel">
          <EChart
            option={rateBarOption(groups.ProductCD ?? [], "Produit transactionnel", "#cf4d3f")}
          />
        </div>
        <div className="visual-panel">
          <EChart option={rateBarOption(groups.card6 ?? [], "Type de carte", "#087f8c")} />
        </div>
        <div className="visual-panel">
          <EChart option={rateBarOption(groups.amount_bands ?? [], "Taux par montant", "#b88205")} />
        </div>
      </section>

      <section className="split-grid">
        <div>
          <h2>Produit transactionnel</h2>
          <DataTable kind="group" rows={groups.ProductCD ?? []} />
        </div>
        <div>
          <h2>Reseau carte</h2>
          <DataTable kind="group" rows={groups.card4 ?? []} />
        </div>
        <div>
          <h2>Domaine email acheteur</h2>
          <DataTable kind="group" rows={groups.P_emaildomain ?? []} />
        </div>
        <div>
          <h2>Type d'appareil</h2>
          <DataTable kind="group" rows={groups.DeviceType ?? []} />
        </div>
      </section>
    </>
  );
}

function MissingnessView({ data }: { data: DashboardData }) {
  const transactionRows = data.eda.missingness.train_transaction;
  const identityRows = data.eda.missingness.train_identity;
  const topTransactionMissing = transactionRows[0];
  const topIdentityMissing = identityRows[0];

  return (
    <>
      <InsightStrip
        items={[
          {
            icon: AlertTriangle,
            label: "Transaction",
            value: topTransactionMissing?.column ?? "NA",
            detail: `${formatPercent(topTransactionMissing?.missing_pct ?? 0)} de valeurs manquantes`
          },
          {
            icon: Database,
            label: "Identity",
            value: topIdentityMissing?.column ?? "NA",
            detail: `${formatPercent(topIdentityMissing?.missing_pct ?? 0)} de valeurs manquantes`
          },
          {
            icon: Info,
            label: "Lecture modele",
            value: "NA informatif",
            detail: "les absences doivent etre encodees, pas seulement supprimees"
          }
        ]}
      />

      <section className="panel-grid">
        <div className="visual-panel">
          <EChart option={missingnessOption(transactionRows, "Transaction")} height={390} />
        </div>
        <div className="visual-panel">
          <EChart option={missingnessOption(identityRows, "Identity")} height={390} />
        </div>
      </section>
      <section className="split-grid">
        <div>
          <h2>Transaction</h2>
          <DataTable kind="missingness" rows={transactionRows} />
        </div>
        <div>
          <h2>Identity</h2>
          <DataTable kind="missingness" rows={identityRows} />
        </div>
      </section>
    </>
  );
}

function ModelView({ data }: { data: DashboardData }) {
  const model = data.model;
  const scenarios = model.metrics?.threshold_scenarios ?? [];
  const [scenarioIndex, setScenarioIndex] = useState(0);

  useEffect(() => {
    const metrics = model.metrics;
    if (!metrics || scenarios.length === 0) return;
    const bestIndex = scenarios.findIndex(
      (scenario) => Math.abs(scenario.threshold - metrics.best_threshold.threshold) < 0.002
    );
    setScenarioIndex(bestIndex >= 0 ? bestIndex : Math.floor(scenarios.length / 2));
  }, [model.metrics, scenarios.length]);

  if (model.status !== "trained" || !model.metrics || !model.validation) {
    return (
      <section className="empty-state">
        <Gauge aria-hidden="true" />
        <h2>Modele en attente</h2>
        <p>Le rapport modele sera affiche des que `model.json` est disponible.</p>
      </section>
    );
  }
  const selectedIndex = Math.min(Math.max(scenarioIndex, 0), Math.max(scenarios.length - 1, 0));
  const selectedScenario =
    scenarios[selectedIndex] ??
    scenarioFromMatrix(model.metrics.confusion_matrix.matrix, model.metrics.best_threshold);
  const matrix = scenarioToMatrix(selectedScenario);
  const falsePositives = selectedScenario.false_positive;
  const falseNegatives = selectedScenario.false_negative;
  const apLift = model.validation.fraud_rate_valid
    ? model.metrics.average_precision / model.validation.fraud_rate_valid
    : 0;
  const groupedImportance = model.features?.importance?.grouped_top ?? [];
  const topFeature = groupedImportance[0];

  return (
    <>
      <section className="metric-grid metric-grid--model">
        <MetricCard label="ROC AUC" value={formatDecimal(model.metrics.roc_auc, 3)} tone="teal" />
        <MetricCard
          label="Precision moyenne"
          value={formatDecimal(model.metrics.average_precision, 3)}
          tone="coral"
        />
        <MetricCard label="Seuil" value={formatDecimal(model.metrics.best_threshold.threshold, 3)} tone="amber" />
        <MetricCard label="F1" value={formatDecimal(model.metrics.best_threshold.f1, 3)} tone="blue" />
      </section>
      <InsightStrip
        items={[
          {
            icon: Target,
            label: "Tri du risque",
            value: formatDecimal(model.metrics.roc_auc, 3),
            detail: "baseline correcte pour prioriser les controles"
          },
          {
            icon: Activity,
            label: "Signal rare",
            value: `${formatDecimal(apLift, 1)}x`,
            detail: "precision moyenne vs taux fraude validation"
          },
          {
            icon: AlertTriangle,
            label: "Arbitrage seuil",
            value: formatPercent(selectedScenario.recall),
            detail: `${formatPercent(selectedScenario.precision)} de precision`
          },
          {
            icon: Info,
            label: "Erreurs restantes",
            value: formatInteger(falseNegatives),
            detail: `${formatInteger(falsePositives)} faux positifs au seuil ${formatDecimal(
              selectedScenario.threshold,
              3
            )}`
          },
          {
            icon: Layers,
            label: "Signal principal",
            value: topFeature ? humanFeatureName(topFeature.feature) : "NA",
            detail: "importance agregee du modele lineaire"
          }
        ]}
      />
      {scenarios.length > 0 ? (
        <section className="scenario-panel">
          <div className="scenario-copy">
            <h2>Scenario de controle</h2>
            <p>
              Seuil {formatDecimal(selectedScenario.threshold, 3)} :{" "}
              {formatInteger(selectedScenario.flagged_count)} transactions a examiner, soit{" "}
              {formatPercent(selectedScenario.flagged_rate)} de la validation.
            </p>
          </div>
          <input
            aria-label="Seuil du modele"
            type="range"
            min={0}
            max={scenarios.length - 1}
            step={1}
            value={selectedIndex}
            onChange={(event) => setScenarioIndex(Number(event.target.value))}
          />
        </section>
      ) : null}
      <section className="panel-grid">
        <div className="visual-panel">
          <EChart option={confusionOption(matrix)} height={330} />
        </div>
        {scenarios.length > 0 ? (
          <div className="visual-panel">
            <EChart
              option={thresholdScenarioOption(scenarios, selectedScenario.threshold)}
              height={330}
            />
          </div>
        ) : null}
        <div className="model-panel">
          <h2>{modelDisplayName(model.model_name)}</h2>
          <dl>
            <div>
              <dt>Train</dt>
              <dd>{formatInteger(model.validation.rows_train)}</dd>
            </div>
            <div>
              <dt>Validation</dt>
              <dd>{formatInteger(model.validation.rows_valid)}</dd>
            </div>
            <div>
              <dt>Fraude validation</dt>
              <dd>{formatPercent(model.validation.fraud_rate_valid)}</dd>
            </div>
            <div>
              <dt>Precision</dt>
              <dd>{formatPercent(selectedScenario.precision)}</dd>
            </div>
            <div>
              <dt>Recall</dt>
              <dd>{formatPercent(selectedScenario.recall)}</dd>
            </div>
          </dl>
        </div>
      </section>
      {groupedImportance.length > 0 ? (
        <section className="split-grid">
          <div className="visual-panel">
            <EChart
              option={featureImportanceOption(groupedImportance.map(humanFeatureRow))}
              height={390}
            />
          </div>
          <div className="feature-panel">
            <div className="panel-heading">
              <Info aria-hidden="true" />
              <h2>Lecture des variables</h2>
            </div>
            <p>
              Cette importance vient d'une regression logistique avec variables numeriques
              standardisees et categories encodees. Elle sert a expliquer les signaux utilises, pas
              a prouver une causalite.
            </p>
            <ol>
              {groupedImportance.slice(0, 5).map((row) => (
                <li key={row.feature}>
                  <strong>{humanFeatureName(row.feature)}</strong>
                  <span>
                    score {formatDecimal(row.importance, 2)}
                    {row.encoded_count ? `, ${row.encoded_count} modalites` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}
    </>
  );
}

function DecisionsView({ data }: { data: DashboardData }) {
  const { overview, eda, model } = data;
  const topProduct = getTopRisk(eda.groups.ProductCD ?? []);
  const topCard = getTopRisk(eda.groups.card4 ?? []);
  const credit = eda.groups.card6?.find((row) => row.value === "credit");
  const debit = eda.groups.card6?.find((row) => row.value === "debit");
  const creditLift = credit && debit ? credit.fraud_rate / debit.fraud_rate : 0;
  const missingTransaction = eda.missingness.train_transaction[0];
  const metrics = model.status === "trained" ? model.metrics : null;
  const validation = model.status === "trained" ? model.validation : null;
  const modelReady = Boolean(metrics && validation);
  const bestThreshold = metrics?.best_threshold.threshold ?? 0;
  const apLift = metrics && validation ? metrics.average_precision / validation.fraud_rate_valid : 0;
  const identityShare = overview.identity.train_coverage;
  const flaggedScenario = metrics?.threshold_scenarios?.find(
    (scenario) => Math.abs(scenario.threshold - bestThreshold) < 0.002
  );

  return (
    <>
      <section className="decision-hero">
        <div className="decision-hero-copy">
          <span>Lecture finale</span>
          <h2>Fraude rare, concentree, et pilotable par seuil.</h2>
          <p>
            Le risque global reste faible, mais certains segments ressortent nettement. La
            restitution oriente donc vers une surveillance ciblee, une validation temporelle et un
            seuil ajuste a la capacite de controle.
          </p>
        </div>
        <div className="decision-proof-grid" aria-label="Preuves principales">
          <DecisionProof
            label="Taux global"
            value={formatPercent(overview.target.fraud_rate)}
            detail={`${formatInteger(overview.target.fraud_count)} fraudes dans le train`}
          />
          <DecisionProof
            label="Segment fort"
            value={topProduct?.value ?? "NA"}
            detail={`${formatPercent(topProduct?.fraud_rate ?? 0)} de fraude`}
          />
          <DecisionProof
            label="Identity"
            value={formatPercent(identityShare)}
            detail="couverture partielle"
          />
          <DecisionProof
            label="Controle"
            value={flaggedScenario ? formatPercent(flaggedScenario.flagged_rate) : "NA"}
            detail="du flux au seuil retenu"
          />
        </div>
      </section>

      <section className="decision-grid">
        <DecisionCard
          label="Priorite metier"
          rank="P1"
          value={topProduct?.value ?? "NA"}
          title="Surveiller le produit C en premier"
          detail={`${formatPercent(topProduct?.fraud_rate ?? 0)} de fraude, soit ${formatDecimal(
            (topProduct?.fraud_rate ?? 0) / overview.target.fraud_rate,
            1
          )}x le taux global.`}
          impact="Impact fort"
          confidence="Confiance elevee"
        />
        <DecisionCard
          label="Carte"
          rank="P2"
          value={topCard?.value ?? "NA"}
          title="Segment carte a isoler dans le monitoring"
          detail={`${formatPercent(topCard?.fraud_rate ?? 0)} de fraude. Credit vs debit : ${formatDecimal(
            creditLift,
            1
          )}x.`}
          impact="Impact moyen"
          confidence="Confiance moyenne"
        />
        <DecisionCard
          label="Qualite"
          rank="P3"
          value={missingTransaction?.column ?? "NA"}
          title="Ne pas supprimer brutalement les colonnes manquantes"
          detail={`${formatPercent(
            missingTransaction?.missing_pct ?? 0
          )} de valeurs manquantes sur le top champ. L'absence est probablement un signal.`}
          impact="Impact modele"
          confidence="A verifier"
        />
        <DecisionCard
          label="Modele"
          rank="P4"
          value={modelReady ? formatDecimal(bestThreshold, 3) : "NA"}
          title="Utiliser le seuil comme levier operationnel"
          detail={
            modelReady
              ? `Precision moyenne ${formatDecimal(apLift, 1)}x au-dessus du taux de fraude validation.`
              : "Entrainer le modele pour afficher l'arbitrage precision recall."
          }
          impact="Impact controle"
          confidence="Baseline"
        />
      </section>

      <section className="decision-two-column">
        <section className="recommendation-panel">
          <div className="panel-heading">
            <Layers aria-hidden="true" />
            <h2>Plan d'action recommande</h2>
          </div>
          <ol>
            <li>Mettre le produit C et les paiements credit dans un suivi dedie par periode.</li>
            <li>Conserver les indicateurs de valeurs manquantes comme variables explicatives.</li>
            <li>Valider les modeles sur un split temporel, pas un split aleatoire.</li>
            <li>Choisir le seuil selon la capacite de revue et le cout des faux positifs.</li>
          </ol>
        </section>

        <section className="decision-caution">
          <div className="panel-heading">
            <Info aria-hidden="true" />
            <h2>Lecture prudente</h2>
          </div>
          <p>
            Ces constats identifient des priorites de controle, pas des causes definitives. Les
            segments a risque doivent etre suivis dans le temps, car le split train/test est
            temporel et la fraude peut changer de comportement.
          </p>
          <ul>
            <li>Ne pas comparer train et test comme deux echantillons aleatoires.</li>
            <li>Ne pas retirer les champs tres manquants sans tester leur signal.</li>
            <li>Ne pas deployer un seuil sans contrainte metier de revue.</li>
          </ul>
        </section>
      </section>
    </>
  );
}

function MethodologyView({ data }: { data: DashboardData }) {
  const { overview, model } = data;
  const metrics = model.status === "trained" ? model.metrics : null;

  return (
    <>
      <section className="method-hero">
        <div>
          <span>Methodologie</span>
          <h2>Une analyse construite pour eviter les conclusions trop faciles.</h2>
          <p>
            Le dataset est temporel : le train couvre {formatDecimal(overview.time.train_span_days, 0)}{" "}
            jours, le test {formatDecimal(overview.time.test_span_days, 0)} jours, avec un ecart de{" "}
            {formatDecimal(overview.time.gap_days, 0)} jours. La validation du modele respecte donc
            cette logique au lieu de melanger les periodes.
          </p>
        </div>
      </section>

      <section className="method-grid">
        <MethodCard
          label="Donnees"
          title="Pipeline statique"
          detail="Les CSV bruts sont lus localement, normalises en Parquet, puis resumes en JSON legers pour le site."
        />
        <MethodCard
          label="Validation"
          title="Split temporel"
          detail="La baseline est entrainee sur le debut du train et validee sur les 20 % les plus recents."
        />
        <MethodCard
          label="Metriques"
          title="ROC AUC et precision moyenne"
          detail="ROC AUC mesure le tri global du risque. La precision moyenne est plus informative avec une fraude rare."
        />
        <MethodCard
          label="Seuil"
          title="Arbitrage operationnel"
          detail="Le seuil n'est pas absolu : il depend du volume que l'equipe peut controler et du cout des erreurs."
        />
      </section>

      <section className="decision-two-column">
        <section className="recommendation-panel">
          <div className="panel-heading">
            <Layers aria-hidden="true" />
            <h2>Ce qui est deploye dans le site</h2>
          </div>
          <ol>
            <li>Les donnees brutes restent hors frontend et ne sont pas exposees au public.</li>
            <li>Les exports JSON contiennent seulement des agregats, metriques et scenarios.</li>
              <li>Le dashboard est statique, donc compatible GitHub Pages.</li>
            <li>Les onglets sont partageables avec des ancres, par exemple #decisions.</li>
          </ol>
        </section>

        <section className="decision-caution">
          <div className="panel-heading">
            <AlertTriangle aria-hidden="true" />
            <h2>Limites</h2>
          </div>
          <p>
            Le modele actuel est une baseline interpretable, pas le meilleur modele possible pour
            une competition. Il sert a expliquer les arbitrages et a rendre l'exploration lisible.
          </p>
          <ul>
            <li>
              {metrics
                ? `Performance validation : ROC AUC ${formatDecimal(metrics.roc_auc, 3)}, precision moyenne ${formatDecimal(
                    metrics.average_precision,
                    3
                  )}.`
                : "Le rapport modele n'est pas encore entraine."}
            </li>
            <li>Les variables importantes sont des signaux statistiques, pas des causes.</li>
            <li>Un vrai deploiement exigerait suivi drift, calibration et validation metier.</li>
          </ul>
        </section>
      </section>
    </>
  );
}

function getTopRisk(rows: GroupRow[]): GroupRow | undefined {
  return rows
    .filter((row) => row.count > 0)
    .reduce<GroupRow | undefined>(
      (best, row) => (!best || row.fraud_rate > best.fraud_rate ? row : best),
      undefined
    );
}

const featureNameMap: Record<string, string> = {
  TransactionAmt: "Montant transaction",
  ProductCD: "Produit",
  card4: "Reseau carte",
  card6: "Type de carte",
  P_emaildomain: "Email acheteur",
  R_emaildomain: "Email destinataire",
  dist1: "Distance 1",
  dist2: "Distance 2",
  C1: "Compteur C1",
  C2: "Compteur C2",
  C3: "Compteur C3",
  C4: "Compteur C4",
  C5: "Compteur C5",
  C6: "Compteur C6",
  C7: "Compteur C7",
  C8: "Compteur C8",
  C9: "Compteur C9",
  C10: "Compteur C10",
  C11: "Compteur C11",
  C12: "Compteur C12",
  C13: "Compteur C13",
  C14: "Compteur C14"
};

function humanFeatureName(feature: string): string {
  return featureNameMap[feature] ?? feature.replace(/^id_/, "Identity ");
}

function humanFeatureRow(row: FeatureImportanceRow): FeatureImportanceRow {
  return {
    ...row,
    feature: humanFeatureName(row.feature)
  };
}

function modelDisplayName(name: string | null): string {
  if (name === "time_split_logistic_regression") {
    return "Baseline logistique temporelle";
  }
  return name ?? "Modele baseline";
}

function scenarioToMatrix(scenario: ThresholdScenario): number[][] {
  return [
    [scenario.true_negative, scenario.false_positive],
    [scenario.false_negative, scenario.true_positive]
  ];
}

function scenarioFromMatrix(
  matrix: number[][],
  best: { threshold: number; precision: number; recall: number; f1: number }
): ThresholdScenario {
  const trueNegative = matrix[0]?.[0] ?? 0;
  const falsePositive = matrix[0]?.[1] ?? 0;
  const falseNegative = matrix[1]?.[0] ?? 0;
  const truePositive = matrix[1]?.[1] ?? 0;
  const flagged = truePositive + falsePositive;
  const total = trueNegative + falsePositive + falseNegative + truePositive;

  return {
    threshold: best.threshold,
    precision: best.precision,
    recall: best.recall,
    f1: best.f1,
    true_negative: trueNegative,
    false_positive: falsePositive,
    false_negative: falseNegative,
    true_positive: truePositive,
    flagged_count: flagged,
    flagged_rate: total ? flagged / total : 0
  };
}

type DecisionCardProps = {
  label: string;
  rank: string;
  value: string;
  title: string;
  detail: string;
  impact: string;
  confidence: string;
};

function DecisionCard({
  label,
  rank,
  value,
  title,
  detail,
  impact,
  confidence
}: DecisionCardProps) {
  return (
    <article className="decision-card">
      <div className="decision-card-top">
        <span>{label}</span>
        <b>{rank}</b>
      </div>
      <strong>{value}</strong>
      <h3>{title}</h3>
      <p>{detail}</p>
      <div className="decision-tags">
        <small>{impact}</small>
        <small>{confidence}</small>
      </div>
    </article>
  );
}

type DecisionProofProps = {
  label: string;
  value: string;
  detail: string;
};

function DecisionProof({ label, value, detail }: DecisionProofProps) {
  return (
    <article className="decision-proof">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

type MethodCardProps = {
  label: string;
  title: string;
  detail: string;
};

function MethodCard({ label, title, detail }: MethodCardProps) {
  return (
    <article className="method-card">
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </article>
  );
}

type InsightItem = {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
};

function InsightStrip({ items }: { items: InsightItem[] }) {
  return (
    <section className="insight-strip" aria-label="Insights principaux">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <article className="insight-card" key={`${item.label}-${item.value}`}>
            <Icon aria-hidden="true" />
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
