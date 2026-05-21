import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import type { EngagementAnalysisStore } from "@/lib/advisory-store";
import {
  anomalyReviewSummary,
  deriveAnomalyPipelineStatus,
  deriveDeliverStatus,
  deriveDriverPipelineStatus,
  deriveFollowUpPipelineStatus,
  deriveIssueTrackerPipelineStatus,
  deriveReportDraftingStatus,
  driverValidationSummary,
  followUpAgendaSummary,
  issueTrackerSummary,
} from "@/lib/analysis-mutations";
import {
  ENGAGEMENT_PROFILES,
  ENGAGEMENT_NAMES,
  type DeliverStatus,
  type EngagementProfile,
  type PipelineStatus,
  type SkillId,
  type SkillStageMetadata,
} from "@/lib/customer-management";

export interface LiveEngagementRow {
  profile: EngagementProfile;
  analysis: AdvisoryAnalysisOutput | null;
  anomalyStatus: PipelineStatus;
  reportStatus: PipelineStatus;
  deliverStatus: DeliverStatus;
}

function emptySkillStage(status: PipelineStatus = "not_started"): SkillStageMetadata {
  return { status, lastRun: "—", summary: "—", metrics: [] };
}

function buildCustomProfile(
  clientName: string,
  analysis: AdvisoryAnalysisOutput,
  sourceDocs: string[] = []
): EngagementProfile {
  return {
    id: `custom-${clientName}`,
    clientName,
    engagementType: analysis.engagement.deal_type || "Financial Diligence",
    industry: "—",
    sourceDocs,
    deliverStatus: "draft",
    skills: {
      "trial-balance-ingestion": emptySkillStage("complete"),
      "anomaly-detection": emptySkillStage(),
      "driver-analysis": emptySkillStage(),
      "follow-up-questions": emptySkillStage(),
      "issue-tracker": emptySkillStage(),
      "report-drafting": emptySkillStage(),
    },
  };
}

function applyAnalysisToProfile(
  profile: EngagementProfile,
  analysis: AdvisoryAnalysisOutput
): LiveEngagementRow {
  const anomalyStatus = deriveAnomalyPipelineStatus(analysis);
  const reportStatus = deriveReportDraftingStatus(analysis);
  const deliverStatus = deriveDeliverStatus(analysis);

  const skills = { ...profile.skills };
  skills["anomaly-detection"] = {
    ...skills["anomaly-detection"],
    status: anomalyStatus,
    summary: anomalyReviewSummary(analysis),
    metrics: [
      { label: "Approved", value: String(analysis.issue_log.filter((i) => i.review_status === "APPROVED").length) },
      { label: "Edited", value: String(analysis.issue_log.filter((i) => i.review_status === "EDITED").length) },
      { label: "Rejected", value: String(analysis.issue_log.filter((i) => i.review_status === "REJECTED").length) },
    ],
  };
  skills["driver-analysis"] = {
    ...skills["driver-analysis"],
    status: deriveDriverPipelineStatus(analysis),
    summary: driverValidationSummary(analysis),
    metrics: [
      {
        label: "Validated",
        value: String(analysis.issue_log.filter((i) => i.driver_status === "VALIDATED").length),
      },
    ],
  };
  skills["follow-up-questions"] = {
    ...skills["follow-up-questions"],
    status: deriveFollowUpPipelineStatus(analysis),
    summary: followUpAgendaSummary(analysis),
  };
  skills["issue-tracker"] = {
    ...skills["issue-tracker"],
    status: deriveIssueTrackerPipelineStatus(analysis),
    summary: issueTrackerSummary(analysis),
  };
  skills["report-drafting"] = {
    ...skills["report-drafting"],
    status: reportStatus,
    summary:
      reportStatus === "complete"
        ? "Draft reflects approved anomalies"
        : "Awaiting approved anomalies",
  };

  return {
    profile: { ...profile, deliverStatus, skills },
    analysis,
    anomalyStatus,
    reportStatus,
    deliverStatus,
  };
}

export function buildLiveEngagementRows(
  store: EngagementAnalysisStore,
  sourceDocsByClient: Record<string, string[]> = {}
): LiveEngagementRow[] {
  const builtInRows = ENGAGEMENT_PROFILES.map((profile) => {
    const analysis = store[profile.clientName] ?? null;
    const extraDocs = sourceDocsByClient[profile.clientName] ?? [];
    const mergedProfile =
      extraDocs.length > 0
        ? { ...profile, sourceDocs: [...new Set([...profile.sourceDocs, ...extraDocs])] }
        : profile;
    if (analysis) return applyAnalysisToProfile(mergedProfile, analysis);
    return {
      profile: mergedProfile,
      analysis: null,
      anomalyStatus: profile.skills["anomaly-detection"].status,
      reportStatus: profile.skills["report-drafting"].status,
      deliverStatus: profile.deliverStatus,
    };
  });

  const customRows = Object.entries(store)
    .filter(([clientName]) => clientName && !ENGAGEMENT_NAMES.includes(clientName))
    .map(([clientName, analysis]) =>
      applyAnalysisToProfile(
        buildCustomProfile(clientName, analysis, sourceDocsByClient[clientName] ?? []),
        analysis
      )
    );

  return [...builtInRows, ...customRows];
}

export function getSkillStatus(row: LiveEngagementRow, skillId: SkillId): PipelineStatus {
  if (skillId === "anomaly-detection") return row.anomalyStatus;
  if (skillId === "report-drafting") return row.reportStatus;
  if (row.analysis) {
    if (skillId === "driver-analysis") return deriveDriverPipelineStatus(row.analysis);
    if (skillId === "follow-up-questions") return deriveFollowUpPipelineStatus(row.analysis);
    if (skillId === "issue-tracker") return deriveIssueTrackerPipelineStatus(row.analysis);
  }
  return row.profile.skills[skillId].status;
}
