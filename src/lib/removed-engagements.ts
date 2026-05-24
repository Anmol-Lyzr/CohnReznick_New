import type { EngagementAnalysisStore } from "@/lib/advisory-store";
import { DEFAULT_ENGAGEMENT_NAME, isRemovedEngagement } from "@/lib/customer-management";

export function purgeRemovedEngagements(store: EngagementAnalysisStore): EngagementAnalysisStore {
  const next = { ...store };
  for (const key of Object.keys(next)) {
    if (isRemovedEngagement(key)) delete next[key];
  }
  return next;
}

/** Initial load / URL: empty or removed names fall back to the default PoC client. */
export function resolveEngagementName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed || isRemovedEngagement(trimmed)) return DEFAULT_ENGAGEMENT_NAME;
  return trimmed;
}

/**
 * User-driven client field updates. Preserves empty string so "New client…" can show a blank input.
 */
export function normalizeEngagementInput(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (isRemovedEngagement(trimmed)) return DEFAULT_ENGAGEMENT_NAME;
  return trimmed;
}
