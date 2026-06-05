import type { EChartsOption } from "echarts";

import type {
  FeatureImportanceRow,
  GroupRow,
  MissingnessRow,
  ThresholdScenario,
  TimelineRow
} from "../types";
import { formatCompact, formatPercent } from "../lib/format";

const colors = {
  teal: "#087f8c",
  coral: "#cf4d3f",
  amber: "#b88205",
  blue: "#3157b7",
  green: "#167a4a",
  grid: "#d9dde7",
  text: "#16181d",
  muted: "#606575"
};

const textStyle = {
  color: colors.text,
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
};

export function rateBarOption(rows: GroupRow[], title: string, color = colors.teal): EChartsOption {
  return {
    color: [color],
    title: {
      text: title,
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 52, right: 18, bottom: 42, left: 54 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatPercent(Number(value), 2)
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.value),
      axisLabel: { color: colors.muted, interval: 0 },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.muted, formatter: (value: number) => formatPercent(value, 0) },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    series: [
      {
        name: "Taux de fraude",
        type: "bar",
        data: rows.map((row) => row.fraud_rate),
        barMaxWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0] }
      }
    ]
  };
}

export function countBarOption(rows: GroupRow[], title: string, color = colors.blue): EChartsOption {
  return {
    color: [color],
    title: {
      text: title,
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 52, right: 18, bottom: 42, left: 64 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatCompact(Number(value))
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.value),
      axisLabel: { color: colors.muted, interval: 0 },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.muted, formatter: (value: number) => formatCompact(value) },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    series: [
      {
        name: "Transactions",
        type: "bar",
        data: rows.map((row) => row.count),
        barMaxWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0] }
      }
    ]
  };
}

export function timelineOption(rows: TimelineRow[]): EChartsOption {
  return {
    color: [colors.coral, colors.teal],
    title: {
      text: "Evolution temporelle",
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 54, right: 46, bottom: 42, left: 54 },
    legend: { top: 8, right: 0, textStyle: { color: colors.muted } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatPercent(Number(value), 2)
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => `J${row.day}`),
      axisLabel: { color: colors.muted, hideOverlap: true },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.muted, formatter: (value: number) => formatPercent(value, 0) },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    series: [
      {
        name: "Taux de fraude",
        type: "line",
        data: rows.map((row) => row.fraud_rate),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 }
      }
    ]
  };
}

export function missingnessOption(rows: MissingnessRow[], title: string): EChartsOption {
  const top = rows.slice(0, 15).reverse();
  return {
    color: [colors.amber],
    title: {
      text: title,
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 52, right: 24, bottom: 28, left: 92 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatPercent(Number(value), 2)
    },
    xAxis: {
      type: "value",
      axisLabel: { color: colors.muted, formatter: (value: number) => formatPercent(value, 0) },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    yAxis: {
      type: "category",
      data: top.map((row) => row.column),
      axisLabel: { color: colors.muted },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    series: [
      {
        name: "Valeurs manquantes",
        type: "bar",
        data: top.map((row) => row.missing_pct),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] }
      }
    ]
  };
}

export function featureImportanceOption(rows: FeatureImportanceRow[]): EChartsOption {
  const top = rows.slice(0, 12).reverse();
  return {
    color: [colors.blue],
    title: {
      text: "Variables les plus influentes",
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 52, right: 24, bottom: 28, left: 138 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => Number(value).toFixed(3)
    },
    xAxis: {
      type: "value",
      axisLabel: { color: colors.muted },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    yAxis: {
      type: "category",
      data: top.map((row) => row.feature),
      axisLabel: { color: colors.muted },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    series: [
      {
        name: "Importance",
        type: "bar",
        data: top.map((row) => row.importance),
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] }
      }
    ]
  };
}

export function thresholdScenarioOption(
  rows: ThresholdScenario[],
  selectedThreshold: number
): EChartsOption {
  return {
    color: [colors.green, colors.coral, colors.blue],
    title: {
      text: "Compromis par seuil",
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 56, right: 24, bottom: 42, left: 54 },
    legend: { top: 8, right: 0, textStyle: { color: colors.muted } },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => formatPercent(Number(value), 2)
    },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.threshold.toFixed(3)),
      axisLabel: { color: colors.muted },
      axisLine: { lineStyle: { color: colors.grid } },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: colors.muted, formatter: (value: number) => formatPercent(value, 0) },
      splitLine: { lineStyle: { color: colors.grid } }
    },
    series: [
      {
        name: "Precision",
        type: "line",
        data: rows.map((row) => ({
          value: row.precision,
          symbolSize: row.threshold === selectedThreshold ? 8 : 4
        })),
        smooth: true,
        symbol: "circle"
      },
      {
        name: "Recall",
        type: "line",
        data: rows.map((row) => ({
          value: row.recall,
          symbolSize: row.threshold === selectedThreshold ? 8 : 4
        })),
        smooth: true,
        symbol: "circle"
      },
      {
        name: "F1",
        type: "line",
        data: rows.map((row) => ({
          value: row.f1,
          symbolSize: row.threshold === selectedThreshold ? 8 : 4
        })),
        smooth: true,
        symbol: "circle"
      }
    ]
  };
}

export function confusionOption(matrix: number[][]): EChartsOption {
  const values = [
    [0, 0, matrix[0]?.[0] ?? 0],
    [1, 0, matrix[0]?.[1] ?? 0],
    [0, 1, matrix[1]?.[0] ?? 0],
    [1, 1, matrix[1]?.[1] ?? 0]
  ];
  const max = Math.max(...values.map((value) => value[2]), 1);

  return {
    title: {
      text: "Matrice de confusion",
      left: 0,
      textStyle: { ...textStyle, fontSize: 14, fontWeight: 700 }
    },
    grid: { top: 56, right: 24, bottom: 42, left: 84 },
    tooltip: {
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const itemData =
          typeof item === "object" && item !== null && "data" in item ? item.data : undefined;
        const data = Array.isArray(itemData) ? itemData : [0, 0, 0];
        return `${formatCompact(Number(data[2]))} transactions`;
      }
    },
    xAxis: {
      type: "category",
      data: ["Pred. legitime", "Pred. fraude"],
      axisLabel: { color: colors.muted },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.grid } }
    },
    yAxis: {
      type: "category",
      data: ["Reel legitime", "Reel fraude"],
      axisLabel: { color: colors.muted },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: colors.grid } }
    },
    visualMap: {
      min: 0,
      max,
      show: false,
      inRange: { color: ["#eef3f2", colors.green] }
    },
    series: [
      {
        type: "heatmap",
        data: values,
        label: {
          show: true,
          formatter: (params) => formatCompact(Number(Array.isArray(params.data) ? params.data[2] : 0)),
          color: colors.text
        }
      }
    ]
  };
}
