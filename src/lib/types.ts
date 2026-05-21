export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  trend: "up" | "down" | "flat";
  detail?: string;
}

export interface DashboardInsight {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  headline: string;
  summary: string;
  category: string;
  actionLabel?: string;
  href?: string;
}

export interface EngagementProgress {
  ingestion: boolean;
  anomaly: boolean;
  driver: boolean;
  questions: boolean;
  issues: boolean;
  review: boolean;
  report: boolean;
}

export interface EngagementData {
  id: string;
  client: string;
  type: string;
  progress: EngagementProgress;
  lastActivity: string;
  industry: string;
}

export interface SuggestedAction {
  client: string;
  label: string;
  detail: string;
  href: string;
}

export type ReviewStatus = "pending" | "approved" | "edited" | "rejected";

export interface ReviewFinding {
  id: string;
  account: string;
  accountCode: string;
  period: string;
  severity: "critical" | "high" | "medium" | "low";
  headline: string;
  driverSummary: string;
  sourceRef: string;
  status: ReviewStatus;
  editedNote?: string;
}
