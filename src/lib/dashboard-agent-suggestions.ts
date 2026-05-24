import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import type { EngagementAnalysisStore } from "@/lib/advisory-store";
import { getNextStepCta } from "@/lib/agent-cta-catalog";
import { snapshotFromAnalysis, skillHref } from "@/lib/agent-engagement-state";
import { buildLiveEngagementRows } from "@/lib/customer-management-live";
import { ENGAGEMENT_PROFILES, type EngagementProfile, type SkillId } from "@/lib/customer-management";
import type { DashboardInsight, EngagementData, SuggestedAction } from "@/lib/types";
import { toDashboardInsights, toEngagementCard } from "@/lib/advisory-mappers";

const FALLBACK_INSIGHTS: DashboardInsight[] = [
  {
    id: "i1",
    severity: "critical",
    headline: "Freight revenue −11.2% QoQ",
    summary: "Lane rationalization in Q4 2025 — review Horizon Logistics findings.",
    category: "revenue",
    actionLabel: "Review Anomaly",
    href: "/tools/skills/anomaly-detection?client=Horizon%20Logistics%20LLC",
  },
  {
    id: "i4",
    severity: "info",
    headline: "Start with trial balance ingestion",
    summary: "Upload TB data to begin the diligence pipeline.",
    category: "ingestion",
    actionLabel: "Upload TB",
    href: "/tools/skills/trial-balance-ingestion",
  },
];

function profileToEngagementCard(profile: EngagementProfile): EngagementData {
  const complete = (skillId: SkillId) => profile.skills[skillId].status === "complete";
  return {
    id: profile.id,
    client: profile.clientName,
    type: profile.engagementType,
    industry: profile.industry,
    lastActivity: profile.skills["anomaly-detection"].lastRun,
    progress: {
      ingestion: complete("trial-balance-ingestion"),
      anomaly: complete("anomaly-detection"),
      driver: complete("driver-analysis"),
      questions: complete("follow-up-questions"),
      issues: complete("issue-tracker"),
      review: complete("anomaly-detection"),
      report: complete("report-drafting"),
    },
  };
}

const FALLBACK_ENGAGEMENTS: EngagementData[] = ENGAGEMENT_PROFILES.map(profileToEngagementCard);

export function buildDashboardInsights(
  analysis: AdvisoryAnalysisOutput | null,
  store: EngagementAnalysisStore = {}
): DashboardInsight[] {
  const fromStore = Object.values(store).flatMap((a) => toDashboardInsights(a));
  if (fromStore.length > 0) {
    const seen = new Set<string>();
    return fromStore.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }
  if (analysis) return toDashboardInsights(analysis);
  return FALLBACK_INSIGHTS;
}

export function buildDashboardEngagements(
  store: EngagementAnalysisStore,
  primary: EngagementData | null
): EngagementData[] {
  const rows = buildLiveEngagementRows(store);
  const byClient = new Map<string, EngagementData>();
  for (const row of rows) {
    if (!row.analysis) continue;
    const card = toEngagementCard(row.analysis, row.profile.clientName);
    byClient.set(card.client, card);
  }
  const fromStore = Array.from(byClient.values());
  if (fromStore.length > 0) return fromStore;
  if (primary) {
    const seen = new Set([primary.client]);
    const rest = FALLBACK_ENGAGEMENTS.filter((e) => !seen.has(e.client));
    return [primary, ...rest];
  }
  return FALLBACK_ENGAGEMENTS;
}

export function buildDashboardSuggestedActions(
  store: EngagementAnalysisStore,
  analysis: AdvisoryAnalysisOutput | null
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  for (const [client, a] of Object.entries(store)) {
    const snap = snapshotFromAnalysis(a, client);
    const next = getNextStepCta(snap);
    if (next?.href) {
      actions.push({
        client,
        label: next.label,
        detail: next.description ?? snap.blockerMessage ?? "Continue diligence workflow",
        href: next.href,
      });
    }
    if (snap.pendingReviewCount > 0) {
      actions.push({
        client,
        label: `Review ${snap.pendingReviewCount} pending`,
        detail: "Human-in-the-loop before report drafting",
        href: skillHref("anomaly-detection", client, { review: "open" }),
      });
    }
  }

  if (analysis) {
    const snap = snapshotFromAnalysis(analysis, analysis.engagement.client_name);
    const next = getNextStepCta(snap);
    if (next?.href && !actions.some((a) => a.href === next.href)) {
      actions.unshift({
        client: analysis.engagement.client_name,
        label: next.label,
        detail: next.description ?? "Suggested next step",
        href: next.href,
      });
    }
  }

  if (actions.length === 0) {
    const client = ENGAGEMENT_PROFILES[0]?.clientName ?? "Horizon Logistics LLC";
    return [
      {
        client,
        label: "Upload trial balance",
        detail: "Ingest and normalize TB data for analysis",
        href: `/tools/skills/trial-balance-ingestion?client=${encodeURIComponent(client)}`,
      },
      {
        client,
        label: "Run anomaly detection",
        detail: "Flag material account movements",
        href: `/tools/skills/anomaly-detection?client=${encodeURIComponent(client)}`,
      },
    ];
  }

  return actions.slice(0, 6);
}
