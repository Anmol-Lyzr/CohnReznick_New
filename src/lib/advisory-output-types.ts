/** Matches Lyzr agent `advisory_analysis_output` JSON schema */

export type ParseWarningType =
  | "missing_period"
  | "duplicate_account"
  | "format_error"
  | "inferred_account_type";

export type FlagType =
  | "SPIKE"
  | "TREND"
  | "REVERSAL"
  | "STEP_CHANGE"
  | "MARGIN_COMPRESSION";

export type Severity = "HIGH" | "MEDIUM" | "LOW";

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "COGS"
  | "OpEx"
  | "Other";

export type DriverCategory =
  | "Calendar"
  | "Contract"
  | "Cost_Inflation"
  | "Collections"
  | "Legal"
  | "Campaign"
  | "Tax"
  | "Reclassification"
  | "Unexplained"
  | "Other";

export type ReviewStatusAgent =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "EDITED"
  | "REJECTED";

export type DriverStatus = "PENDING" | "VALIDATED" | "CHALLENGED" | "INSUFFICIENT";

export type AgendaStatus = "PENDING" | "INCLUDED" | "DEFERRED" | "EXCLUDED" | "EDITED";

export type TrackerStatus = "PENDING" | "CONFIRMED" | "ESCALATED" | "RESOLVED";

export interface EngagementMeta {
  engagement_ref: string;
  client_name: string;
  deal_type: string;
  period_start: string;
  period_end: string;
  total_months: number;
  currency: string;
  materiality_threshold: number;
  anomaly_pct_threshold: number;
  report_generated_at: string;
  total_accounts_parsed: number;
}

export interface ParseWarning {
  warning_type: ParseWarningType;
  account_code: string;
  period: string;
  detail: string;
}

export interface SuppressedAnomaly {
  account_code: string;
  account_name: string;
  period: string;
  flag_type: FlagType;
  absolute_delta: number;
  suppression_reason: string;
}

export interface CorrelatedAccount {
  account_code: string;
  account_name: string;
  correlation_direction: "SAME" | "INVERSE";
  correlation_note: string;
}

export interface FollowUpQuestion {
  question_id: string;
  question_text: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: "Revenue" | "Cost" | "Working_Capital" | "Payroll" | "Legal" | "Other";
  question_type: "Investigative" | "Confirmation" | "Documentation" | "Run_Rate";
  requires_documentation: boolean;
  context_note: string;
  agenda_status: AgendaStatus;
}

export interface IssueLogEntry {
  issue_id: string;
  anomaly_id: string;
  display_order: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  flag_type: FlagType;
  severity: Severity;
  direction: "UP" | "DOWN";
  period_start: string;
  period_end: string;
  absolute_delta: number;
  mom_pct_change: number;
  baseline_avg: number;
  peak_value: number;
  issue_summary: string;
  driver_explanation: string;
  driver_category: DriverCategory;
  recurrence_type: "ONE_TIME" | "RECURRING" | "UNKNOWN";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  is_unexplained: boolean;
  needs_immediate_attention: boolean;
  correlated_accounts: CorrelatedAccount[];
  workpaper_ref: string;
  workpaper_excerpt: string;
  follow_up_questions: FollowUpQuestion[];
  source_refs: string[];
  review_status: ReviewStatusAgent;
  reviewer_comment: string;
  driver_status: DriverStatus;
  tracker_status: TrackerStatus;
}

export interface ReportIssueTableRow {
  issue_number: string;
  account: string;
  period: string;
  movement: string;
  driver: string;
  severity: Severity;
  primary_question: string;
}

export interface ReportFindingDetail {
  issue_id: string;
  observation: string;
  driver: string;
  implications: string;
  follow_up_questions: string[];
  source_refs: string[];
}

export interface QuestionAgenda {
  Revenue: string[];
  Cost: string[];
  Working_Capital: string[];
  Payroll: string[];
  Legal: string[];
  Other: string[];
}

export interface WorkpaperIndexEntry {
  ref: string;
  account: string;
  period: string;
  note_type: string;
}

export interface AdvisoryReport {
  executive_summary: string;
  issue_table: ReportIssueTableRow[];
  findings_detail: ReportFindingDetail[];
  question_agenda: QuestionAgenda;
  workpaper_index: WorkpaperIndexEntry[];
}

export interface SummaryStats {
  total_issues: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  needs_immediate_attention: number;
  unexplained: number;
  total_questions: number;
  suppressed_anomalies: number;
  workpaper_notes_matched: number;
  parse_warnings: number;
}

export interface AdvisoryAnalysisOutput {
  engagement: EngagementMeta;
  parse_warnings: ParseWarning[];
  suppressed_anomalies: SuppressedAnomaly[];
  issue_log: IssueLogEntry[];
  report: AdvisoryReport;
  summary_stats: SummaryStats;
}
