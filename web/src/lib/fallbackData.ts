import type { DashboardData } from "../types";

export const fallbackData: DashboardData = {
  overview: {
    generated_at: undefined,
    files: {
      train_transaction: { rows: 590540, columns: 394 },
      test_transaction: { rows: 506691, columns: 393 },
      train_identity: { rows: 144233, columns: 41 },
      test_identity: { rows: 141907, columns: 41 }
    },
    target: {
      fraud_count: 20663,
      non_fraud_count: 569877,
      fraud_rate: 0.03499
    },
    time: {
      train_dt_min: 86400,
      train_dt_max: 15811131,
      train_span_days: 182,
      test_dt_min: 18403224,
      test_dt_max: 34214345,
      test_span_days: 183,
      gap_days: 30
    },
    identity: {
      train_coverage: 0.2442,
      test_coverage: 0.2801
    },
    schema: {
      transaction_train_only: ["isFraud"],
      transaction_test_only: [],
      transaction_groups: {
        card: 6,
        addr: 2,
        dist: 2,
        C: 14,
        D: 15,
        M: 9,
        V: 339
      }
    }
  },
  eda: {
    generated_at: undefined,
    groups: {
      ProductCD: [
        { value: "W", count: 439670, fraud_count: 8969, fraud_rate: 0.0204 },
        { value: "C", count: 68519, fraud_count: 8008, fraud_rate: 0.1169 },
        { value: "R", count: 37699, fraud_count: 1426, fraud_rate: 0.0378 },
        { value: "H", count: 33024, fraud_count: 1574, fraud_rate: 0.0477 },
        { value: "S", count: 11628, fraud_count: 686, fraud_rate: 0.059 }
      ],
      card4: [
        { value: "visa", count: 384767, fraud_count: 13373, fraud_rate: 0.0348 },
        { value: "mastercard", count: 189217, fraud_count: 6496, fraud_rate: 0.0343 },
        { value: "american express", count: 8328, fraud_count: 239, fraud_rate: 0.0287 },
        { value: "discover", count: 6651, fraud_count: 514, fraud_rate: 0.0773 }
      ],
      card6: [
        { value: "debit", count: 439938, fraud_count: 10674, fraud_rate: 0.0243 },
        { value: "credit", count: 148986, fraud_count: 9950, fraud_rate: 0.0668 }
      ],
      amount_bands: [
        { value: "0-10", count: 18669, fraud_count: 800, fraud_rate: 0.0428 },
        { value: "10-25", count: 82610, fraud_count: 3323, fraud_rate: 0.0402 },
        { value: "25-50", count: 118774, fraud_count: 4767, fraud_rate: 0.0401 },
        { value: "50-100", count: 180442, fraud_count: 5812, fraud_rate: 0.0322 },
        { value: "100-250", count: 124921, fraud_count: 3970, fraud_rate: 0.0318 },
        { value: "250-500", count: 41083, fraud_count: 1338, fraud_rate: 0.0326 },
        { value: "500-1000", count: 17787, fraud_count: 502, fraud_rate: 0.0282 },
        { value: "1000+", count: 8254, fraud_count: 151, fraud_rate: 0.0183 }
      ],
      P_emaildomain: [],
      R_emaildomain: [],
      DeviceType: []
    },
    amount_quantiles: {
      q0: 0.251,
      q0_25: 43.321,
      q0_5: 68.769,
      q0_75: 125,
      q0_9: 275.293,
      q0_99: 1104,
      q1: 31937.391
    },
    timeline: [],
    missingness: {
      train_transaction: [
        { column: "dist2", missing: 552913, missing_pct: 0.9363 },
        { column: "D7", missing: 551623, missing_pct: 0.9341 },
        { column: "D13", missing: 528588, missing_pct: 0.8951 },
        { column: "D14", missing: 528353, missing_pct: 0.8947 }
      ],
      train_identity: [
        { column: "id_24", missing: 139486, missing_pct: 0.9671 },
        { column: "id_25", missing: 139101, missing_pct: 0.9644 },
        { column: "id_07", missing: 139078, missing_pct: 0.9643 },
        { column: "id_08", missing: 139078, missing_pct: 0.9643 }
      ]
    }
  },
  model: {
    generated_at: undefined,
    status: "not_trained",
    model_name: null,
    validation: null,
    metrics: null,
    features: null
  }
};
