export type GroupRow = {
  value: string;
  count: number;
  fraud_count: number;
  fraud_rate: number;
};

export type MissingnessRow = {
  column: string;
  missing: number;
  missing_pct: number;
};

export type TimelineRow = {
  day: number;
  count: number;
  fraud_count: number;
  fraud_rate: number;
};

export type ThresholdScenario = {
  threshold: number;
  precision: number;
  recall: number;
  f1: number;
  true_negative: number;
  false_positive: number;
  false_negative: number;
  true_positive: number;
  flagged_count: number;
  flagged_rate: number;
};

export type FeatureImportanceRow = {
  feature: string;
  importance: number;
  max_abs_coefficient?: number;
  encoded_count?: number;
  base_feature?: string;
  coefficient?: number;
  direction?: "risk_up" | "risk_down";
};

export type OverviewData = {
  generated_at?: string;
  files: {
    train_transaction: { rows: number; columns: number };
    test_transaction: { rows: number; columns: number };
    train_identity: { rows: number; columns: number };
    test_identity: { rows: number; columns: number };
  };
  target: {
    fraud_count: number;
    non_fraud_count: number;
    fraud_rate: number;
  };
  time: {
    train_dt_min: number;
    train_dt_max: number;
    train_span_days: number;
    test_dt_min: number;
    test_dt_max: number;
    test_span_days: number;
    gap_days: number;
  };
  identity: {
    train_coverage: number;
    test_coverage: number;
  };
  schema: {
    transaction_train_only: string[];
    transaction_test_only: string[];
    transaction_groups: Record<string, number>;
  };
};

export type EdaData = {
  generated_at?: string;
  groups: Record<string, GroupRow[]>;
  amount_quantiles: Record<string, number>;
  timeline: TimelineRow[];
  missingness: {
    train_transaction: MissingnessRow[];
    train_identity: MissingnessRow[];
  };
};

export type ModelData = {
  generated_at?: string;
  status: "not_trained" | "trained";
  model_name: string | null;
  validation: null | {
    strategy: string;
    rows_train: number;
    rows_valid: number;
    fraud_rate_valid: number;
  };
  metrics: null | {
    roc_auc: number;
    average_precision: number;
    best_threshold: {
      threshold: number;
      precision: number;
      recall: number;
      f1: number;
    };
    confusion_matrix: {
      labels: string[];
      matrix: number[][];
    };
    threshold_scenarios?: ThresholdScenario[];
  };
  features: null | {
    numeric: string[];
    categorical: string[];
    importance?: {
      grouped_top: FeatureImportanceRow[];
      encoded_top: FeatureImportanceRow[];
    };
  };
};

export type DashboardData = {
  overview: OverviewData;
  eda: EdaData;
  model: ModelData;
};
