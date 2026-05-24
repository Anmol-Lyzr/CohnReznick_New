export type PipelineStatus = "complete" | "in_progress" | "pending" | "not_started";
export type DeliverStatus = "delivered" | "ready" | "in_review" | "draft" | "blocked";

export type SkillId =
  | "trial-balance-ingestion"
  | "anomaly-detection"
  | "driver-analysis"
  | "follow-up-questions"
  | "issue-tracker"
  | "report-drafting";

export interface SkillStageMetadata {
  status: PipelineStatus;
  lastRun: string;
  summary: string;
  metrics: { label: string; value: string }[];
}

export interface EngagementProfile {
  id: string;
  clientName: string;
  engagementType: string;
  industry: string;
  sourceDocs: string[];
  deliverStatus: DeliverStatus;
  skills: Record<SkillId, SkillStageMetadata>;
}

export const SKILL_LABELS: Record<SkillId, string> = {
  "trial-balance-ingestion": "TB Ingestion",
  "anomaly-detection": "Anomaly Detection",
  "driver-analysis": "Driver Analysis",
  "follow-up-questions": "Follow-Up Questions",
  "issue-tracker": "Issue Tracker",
  "report-drafting": "Report Drafting",
};

export const SKILL_HREFS: Record<SkillId, string> = {
  "trial-balance-ingestion": "/tools/skills/trial-balance-ingestion",
  "anomaly-detection": "/tools/skills/anomaly-detection",
  "driver-analysis": "/tools/skills/driver-analysis",
  "follow-up-questions": "/tools/skills/follow-up-questions",
  "issue-tracker": "/tools/skills/issue-tracker",
  "report-drafting": "/tools/skills/report-drafting",
};

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  complete: "Complete",
  in_progress: "In Progress",
  pending: "Pending",
  not_started: "Not Started",
};

export const DELIVER_STATUS_LABELS: Record<DeliverStatus, string> = {
  delivered: "Delivered",
  ready: "Ready",
  in_review: "In Review",
  draft: "Draft",
  blocked: "Blocked",
};

export const ENGAGEMENT_STORAGE_KEY = "cohnreznick-selected-engagement";
export const DEFAULT_ENGAGEMENT_NAME = "Horizon Logistics LLC";

/** Retired clients — purged from store and redirects */
export const REMOVED_ENGAGEMENT_NAMES = ["TargetCo Acquisition"] as const;

export function isRemovedEngagement(clientName: string): boolean {
  return (REMOVED_ENGAGEMENT_NAMES as readonly string[]).includes(clientName);
}

function skill(
  status: PipelineStatus,
  lastRun: string,
  summary: string,
  metrics: { label: string; value: string }[]
): SkillStageMetadata {
  return { status, lastRun, summary, metrics };
}

export const ENGAGEMENT_PROFILES: EngagementProfile[] = [
  {
    id: "c1",
    clientName: "Horizon Logistics LLC",
    engagementType: "Financial Diligence",
    industry: "Transportation",
    sourceDocs: ["TB_Horizon_FY25.csv"],
    deliverStatus: "draft",
    skills: {
      "trial-balance-ingestion": skill("complete", "May 15, 2026", "24 months ingested — freight revenue and fuel cost accounts normalized.", [
        { label: "Accounts", value: "89" },
        { label: "Periods", value: "24 mo" },
        { label: "File", value: "TB_Horizon_FY25.csv" },
      ]),
      "anomaly-detection": skill("complete", "May 16, 2026", "3 flags — fuel surcharge lag, fleet depreciation spike.", [
        { label: "Flags", value: "3" },
        { label: "Threshold", value: "5%" },
        { label: "Critical", value: "1" },
      ]),
      "driver-analysis": skill("in_progress", "May 20, 2026", "Fuel cost pass-through analysis in progress.", [
        { label: "Drivers", value: "2 / 3" },
        { label: "Fleet capex", value: "Analyzing" },
        { label: "ETA", value: "1 day" },
      ]),
      "follow-up-questions": skill("not_started", "—", "Blocked until driver analysis completes.", [
        { label: "Questions", value: "—" },
        { label: "Dependency", value: "Driver analysis" },
        { label: "Est. count", value: "8–10" },
      ]),
      "issue-tracker": skill("pending", "—", "2 draft issues ready to log after driver sign-off.", [
        { label: "Draft issues", value: "2" },
        { label: "Severity", value: "1 HIGH" },
        { label: "Status", value: "Queued" },
      ]),
      "report-drafting": skill("not_started", "—", "Pipeline incomplete — report drafting not available.", [
        { label: "Template", value: "—" },
        { label: "Blocker", value: "Driver + issues" },
        { label: "Deliver", value: "Draft" },
      ]),
    },
  },
  {
    id: "c2",
    clientName: "Summit Retail Group",
    engagementType: "Quality of Earnings",
    industry: "Retail",
    sourceDocs: ["TB_Summit_Q1-26.xlsx"],
    deliverStatus: "blocked",
    skills: {
      "trial-balance-ingestion": skill("in_progress", "May 21, 2026", "Q1 2026 upload in progress — store-level GL mapping pending.", [
        { label: "Accounts", value: "~210 est." },
        { label: "Periods", value: "15 mo target" },
        { label: "File", value: "TB_Summit_Q1-26.xlsx" },
      ]),
      "anomaly-detection": skill("not_started", "—", "Waiting on TB normalization and store rollup.", [
        { label: "Flags", value: "—" },
        { label: "Focus", value: "Same-store sales" },
        { label: "Blocker", value: "TB ingestion" },
      ]),
      "driver-analysis": skill("not_started", "—", "Not started — no anomalies flagged yet.", [
        { label: "Drivers", value: "—" },
        { label: "Focus", value: "Inventory shrink" },
        { label: "Blocker", value: "Anomaly detection" },
      ]),
      "follow-up-questions": skill("not_started", "—", "Engagement on hold pending data completeness.", [
        { label: "Questions", value: "—" },
        { label: "Mgmt data", value: "Requested" },
        { label: "Blocker", value: "TB ingestion" },
      ]),
      "issue-tracker": skill("not_started", "—", "No issues logged — engagement blocked.", [
        { label: "Issues", value: "0" },
        { label: "Blocker", value: "Data gap" },
        { label: "Action", value: "Client upload" },
      ]),
      "report-drafting": skill("not_started", "—", "Blocked — insufficient source data for any output.", [
        { label: "Template", value: "—" },
        { label: "Deliver", value: "Blocked" },
        { label: "Blocker", value: "TB ingestion" },
      ]),
    },
  },
  {
    id: "c3",
    clientName: "NorthBridge Manufacturing",
    engagementType: "Transaction Diligence",
    industry: "Industrial",
    sourceDocs: ["TB_NorthBridge_36mo.xlsx"],
    deliverStatus: "ready",
    skills: {
      "trial-balance-ingestion": skill("complete", "May 10, 2026", "36 months — 168 manufacturing GL accounts with BOM cost centers.", [
        { label: "Accounts", value: "168" },
        { label: "Periods", value: "36 mo" },
        { label: "File", value: "TB_NorthBridge_36mo.xlsx" },
      ]),
      "anomaly-detection": skill("complete", "May 11, 2026", "4 flags — raw materials, WIP, overhead allocation.", [
        { label: "Flags", value: "4" },
        { label: "Threshold", value: "3%" },
        { label: "Critical", value: "1" },
      ]),
      "driver-analysis": skill("complete", "May 12, 2026", "COGS and inventory drivers fully mapped with workpaper refs.", [
        { label: "Drivers", value: "4" },
        { label: "WIP/COGS", value: "Linked" },
        { label: "Workpapers", value: "WP-02, WP-09" },
      ]),
      "follow-up-questions": skill("complete", "May 13, 2026", "8 questions — supply chain and capacity utilization focus.", [
        { label: "Questions", value: "8" },
        { label: "High priority", value: "2" },
        { label: "Approved", value: "Yes" },
      ]),
      "issue-tracker": skill("complete", "May 14, 2026", "4 issues — all approved in Anomaly Detection.", [
        { label: "Issues", value: "4" },
        { label: "Approved", value: "4 / 4" },
        { label: "Closed", value: "0" },
      ]),
      "report-drafting": skill("complete", "May 15, 2026", "Diligence report draft ready for final partner sign-off.", [
        { label: "Template", value: "Word — Diligence" },
        { label: "Pages", value: "42" },
        { label: "Deliver", value: "Ready" },
      ]),
    },
  },
];

export const ENGAGEMENT_NAMES = ENGAGEMENT_PROFILES.map((e) => e.clientName);

export function getEngagementByName(name: string): EngagementProfile | undefined {
  return ENGAGEMENT_PROFILES.find((e) => e.clientName === name);
}

export function getSourceDocsForEngagement(clientName: string): string[] {
  const profile = getEngagementByName(clientName);
  return profile?.sourceDocs ?? [];
}

export function getEngagementSkillStatus(profile: EngagementProfile, skillId: SkillId): PipelineStatus {
  return profile.skills[skillId].status;
}

/** @deprecated Use ENGAGEMENT_PROFILES — kept for customer management table */
export interface CustomerRecord {
  id: string;
  clientName: string;
  anomalyDetection: PipelineStatus;
  driverAnalysis: PipelineStatus;
  issueTracker: PipelineStatus;
  question: PipelineStatus;
  sourceDocs: string[];
  deliverStatus: DeliverStatus;
}

export const INITIAL_CUSTOMERS: CustomerRecord[] = ENGAGEMENT_PROFILES.map((p) => ({
  id: p.id,
  clientName: p.clientName,
  anomalyDetection: p.skills["anomaly-detection"].status,
  driverAnalysis: p.skills["driver-analysis"].status,
  issueTracker: p.skills["issue-tracker"].status,
  question: p.skills["follow-up-questions"].status,
  sourceDocs: p.sourceDocs,
  deliverStatus: p.deliverStatus,
}));
