import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import type { EngagementAnalysisStore } from "@/lib/advisory-store";
import type { SkillId } from "@/lib/customer-management";
import { SKILL_HREFS } from "@/lib/customer-management";
import { DEFAULT_ENGAGEMENT_NAME, ENGAGEMENT_STORAGE_KEY } from "@/lib/customer-management";
import type { EngagementProgress } from "@/lib/types";

export interface EngagementSnapshot {
  clientName: string;
  hasAnalysis: boolean;
  progress: EngagementProgress;
  pendingReviewCount: number;
  approvedCount: number;
  highSeverityPending: number;
  pipelineStep: number;
  nextSkillId: SkillId | null;
  blockerMessage?: string;
}

function emptyProgress(): EngagementProgress {
  return {
    ingestion: false,
    anomaly: false,
    driver: false,
    questions: false,
    issues: false,
    review: false,
    report: false,
  };
}

export function progressFromAnalysis(analysis: AdvisoryAnalysisOutput): EngagementProgress {
  const pending = analysis.issue_log.some((i) => i.review_status === "PENDING_REVIEW");
  const approved = analysis.issue_log.some((i) =>
    ["APPROVED", "EDITED"].includes(i.review_status)
  );
  const hasDrivers = analysis.issue_log.some((i) => i.driver_explanation?.length > 0);
  const hasQuestions = analysis.issue_log.some((i) => i.follow_up_questions.length > 0);

  return {
    ingestion:
      analysis.engagement.total_accounts_parsed > 0 || analysis.engagement.total_months > 0,
    anomaly: analysis.issue_log.length > 0,
    driver: hasDrivers,
    questions: hasQuestions,
    issues: analysis.issue_log.length > 0,
    review: !pending && analysis.issue_log.length > 0,
    report: approved && !pending,
  };
}

export function snapshotFromAnalysis(
  analysis: AdvisoryAnalysisOutput | null,
  clientName: string
): EngagementSnapshot {
  if (!analysis) {
    return {
      clientName,
      hasAnalysis: false,
      progress: emptyProgress(),
      pendingReviewCount: 0,
      approvedCount: 0,
      highSeverityPending: 0,
      pipelineStep: 1,
      nextSkillId: "trial-balance-ingestion",
      blockerMessage: undefined,
    };
  }

  const progress = progressFromAnalysis(analysis);
  const pendingReviewCount = analysis.issue_log.filter(
    (i) => i.review_status === "PENDING_REVIEW"
  ).length;
  const approvedCount = analysis.issue_log.filter((i) =>
    ["APPROVED", "EDITED"].includes(i.review_status)
  ).length;
  const highSeverityPending = analysis.issue_log.filter(
    (i) => i.review_status === "PENDING_REVIEW" && i.severity === "HIGH"
  ).length;

  const { pipelineStep, nextSkillId, blockerMessage } = resolvePipelineStep(
    progress,
    pendingReviewCount,
    approvedCount
  );

  return {
    clientName: analysis.engagement.client_name,
    hasAnalysis: true,
    progress,
    pendingReviewCount,
    approvedCount,
    highSeverityPending,
    pipelineStep,
    nextSkillId,
    blockerMessage,
  };
}

function resolvePipelineStep(
  progress: EngagementProgress,
  pendingReview: number,
  approvedCount: number
): { pipelineStep: number; nextSkillId: SkillId | null; blockerMessage?: string } {
  if (!progress.ingestion) {
    return { pipelineStep: 1, nextSkillId: "trial-balance-ingestion" };
  }
  if (!progress.anomaly) {
    return { pipelineStep: 3, nextSkillId: "anomaly-detection" };
  }
  if (pendingReview > 0) {
    return {
      pipelineStep: 7,
      nextSkillId: "anomaly-detection",
      blockerMessage: `${pendingReview} finding${pendingReview === 1 ? "" : "s"} pending review`,
    };
  }
  if (!progress.driver) {
    return { pipelineStep: 4, nextSkillId: "driver-analysis" };
  }
  if (!progress.questions) {
    return { pipelineStep: 5, nextSkillId: "follow-up-questions" };
  }
  if (!progress.issues) {
    return { pipelineStep: 6, nextSkillId: "issue-tracker" };
  }
  if (!progress.report && approvedCount === 0) {
    return {
      pipelineStep: 7,
      nextSkillId: "anomaly-detection",
      blockerMessage: "Approve anomalies before report drafting",
    };
  }
  if (!progress.report) {
    return { pipelineStep: 8, nextSkillId: "report-drafting" };
  }
  return { pipelineStep: 9, nextSkillId: "report-drafting" };
}

export function getActiveClientName(
  store: EngagementAnalysisStore,
  urlClient: string | null,
  options?: { readStorage?: boolean }
): string {
  if (urlClient?.trim()) return urlClient.trim();
  if (options?.readStorage !== false && typeof window !== "undefined") {
    const stored = localStorage.getItem(ENGAGEMENT_STORAGE_KEY)?.trim();
    if (stored) return stored;
  }
  const keys = Object.keys(store);
  if (keys.length > 0) return keys[0];
  return DEFAULT_ENGAGEMENT_NAME;
}

export function skillHref(skillId: SkillId, clientName: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ client: clientName, ...extra });
  return `${SKILL_HREFS[skillId]}?${params.toString()}`;
}

export function countGlobalInbox(store: EngagementAnalysisStore): number {
  let total = 0;
  for (const analysis of Object.values(store)) {
    total += analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  }
  return total;
}
