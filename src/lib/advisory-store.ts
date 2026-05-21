import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";

const STORAGE_KEY = "cohnreznick_engagement_analyses";
const LEGACY_KEY = "cohnreznick_advisory_analysis";

export type EngagementAnalysisStore = Record<string, AdvisoryAnalysisOutput>;

export function loadEngagementStore(): EngagementAnalysisStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as EngagementAnalysisStore;

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const single = JSON.parse(legacy) as AdvisoryAnalysisOutput;
      const store = { [single.engagement.client_name]: single };
      saveEngagementStore(store);
      localStorage.removeItem(LEGACY_KEY);
      return store;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveEngagementStore(store: EngagementAnalysisStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadEngagementAnalysis(clientName: string): AdvisoryAnalysisOutput | null {
  const store = loadEngagementStore();
  return store[clientName] ?? null;
}

export function saveEngagementAnalysis(data: AdvisoryAnalysisOutput): void {
  const store = loadEngagementStore();
  store[data.engagement.client_name] = data;
  saveEngagementStore(store);
}

export function clearEngagementStore(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

/** @deprecated Use saveEngagementAnalysis */
export function saveStoredAnalysis(data: AdvisoryAnalysisOutput): void {
  saveEngagementAnalysis(data);
}

/** @deprecated Use loadEngagementAnalysis for a specific client */
export function loadStoredAnalysis(): AdvisoryAnalysisOutput | null {
  const store = loadEngagementStore();
  const keys = Object.keys(store);
  return keys.length > 0 ? store[keys[0]] : null;
}
