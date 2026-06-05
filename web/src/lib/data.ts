import type { DashboardData, EdaData, ModelData, OverviewData } from "../types";
import { fallbackData } from "./fallbackData";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadDashboardData(): Promise<{ data: DashboardData; source: "static" | "fallback" }> {
  try {
    const [overview, eda, model] = await Promise.all([
      fetchJson<OverviewData>("data/overview.json"),
      fetchJson<EdaData>("data/eda.json"),
      fetchJson<ModelData>("data/model.json")
    ]);

    return {
      data: { overview, eda, model },
      source: "static"
    };
  } catch {
    return {
      data: fallbackData,
      source: "fallback"
    };
  }
}
