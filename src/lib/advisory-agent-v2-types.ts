/** Lyzr agent `cohnreznick_advisory_ai_analyst` structured output (extended for full UI) */

import type {
  AccountType,
  AgendaStatus,
  CorrelatedAccount,
  DriverCategory,
  DriverStatus,
  FlagType,
  ParseWarning,
  ParseWarningType,
  Severity,
  SuppressedAnomaly,
  TrackerStatus,
} from "@/lib/advisory-output-types";

export type AgentV2Status = "success" | "warning" | "error";

export type AgentV2FindingSeverity = "low" | "medium" | "high" | "critical";

export type AgentV2ReviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "requires_revision";

export interface AgentV2Engagement {
  engagement_ref: string;
  client_name: string;
  deal_type: string;
  period_start: string;
  period_end: string;
  total_months: number;
  currency: string;
  materiality_threshold: number;
  anomaly_pct_threshold: number;
}

export interface AgentV2TrialBalance {
  ingestion_status: string;
  readiness_message: string;
}

export interface AgentV2AnalysisSummary {
  files_processed: number;
  months_analyzed: number;
  accounts_analyzed: number;
  material_findings_count: number;
  high_severity_issues: number;
  medium_severity_issues: number;
  low_severity_issues: number;
  parse_warnings_count: number;
  suppressed_anomalies_count: number;
  total_questions: number;
  unexplained_count: number;
  needs_immediate_attention_count: number;
  workpaper_notes_matched: number;
}

export interface AgentV2DriverAnalysis {
  primary_driver: string;
  confidence_score: number;
  driver_category: DriverCategory;
  recurrence_type: "ONE_TIME" | "RECURRING" | "UNKNOWN";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  driver_status: DriverStatus;
}

export interface AgentV2SourceTraceability {
  file_name: string;
  sheet_name: string;
  row_numbers: number[];
}

export interface AgentV2ManagementQuestion {
  question_id: string;
  question_text: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: "Revenue" | "Cost" | "Working_Capital" | "Payroll" | "Legal" | "Other";
  question_type: "Investigative" | "Confirmation" | "Documentation" | "Run_Rate";
  requires_documentation: boolean;
  context_note: string;
  agenda_status: AgendaStatus;
}

export interface AgentV2Finding {
  finding_id: string;
  display_order: number;
  title: string;
  severity: AgentV2FindingSeverity;
  materiality: string;
  account_name: string;
  account_code: string;
  account_type: AccountType;
  period: string;
  period_start: string;
  period_end: string;
  change_percentage: number;
  absolute_delta: number;
  mom_pct_change: number;
  baseline_avg: number;
  peak_value: number;
  z_score_estimate: number;
  flag_type: FlagType;
  direction: "UP" | "DOWN";
  summary: string;
  driver_analysis: AgentV2DriverAnalysis;
  is_unexplained: boolean;
  needs_immediate_attention: boolean;
  correlated_accounts: CorrelatedAccount[];
  management_questions: AgentV2ManagementQuestion[];
  source_traceability: AgentV2SourceTraceability;
  workpaper_ref: string;
  workpaper_excerpt: string;
  review_status: AgentV2ReviewStatus;
  reviewer_comment: string;
  tracker_status: TrackerStatus;
}

export interface AgentV2IssueTrackerEntry {
  issue_id: string;
  linked_finding_id: string;
  severity: string;
  status: string;
  owner: string | null;
}

export interface AgentV2ReportFindingDetail {
  issue_id: string;
  observation: string;
  driver: string;
  implications: string;
  follow_up_questions: string[];
  source_refs: string[];
}

export interface AgentV2ReportIssueTableRow {
  issue_number: string;
  account: string;
  period: string;
  movement: string;
  driver: string;
  severity: Severity;
  primary_question: string;
}

export interface AgentV2ReportSummary {
  executive_summary: string;
  key_risks: string[];
  recommended_next_steps: string[];
  findings_detail: AgentV2ReportFindingDetail[];
  issue_table: AgentV2ReportIssueTableRow[];
}

export interface AgentV2CtaPayload {
  review_required: boolean;
  next_stage: string;
}

export interface AgentV2CtaAction {
  label: string;
  action: string;
  variant: string;
  description: string[];
  payload: AgentV2CtaPayload;
}

export interface AgentV2AuditTrail {
  generated_by: string;
  review_required: boolean;
  generated_timestamp: string;
  source_traceability_enabled: boolean;
}

export interface CohnReznickAdvisoryAiAnalystOutput {
  agent_name: string;
  agent_role: string;
  status: AgentV2Status;
  engagement: AgentV2Engagement;
  trial_balance: AgentV2TrialBalance;
  analysis_summary: AgentV2AnalysisSummary;
  parse_warnings: ParseWarning[];
  suppressed_anomalies: SuppressedAnomaly[];
  findings: AgentV2Finding[];
  issue_tracker: AgentV2IssueTrackerEntry[];
  report_summary: AgentV2ReportSummary;
  cta_actions: AgentV2CtaAction[];
  audit_trail: AgentV2AuditTrail;
}

/** Legacy/minimal agent payloads (pre-extension) */
export interface LegacyAgentV2Output {
  agent_name: string;
  agent_role: string;
  status: AgentV2Status;
  analysis_summary: Partial<AgentV2AnalysisSummary> & {
    files_processed: number;
    months_analyzed: number;
    accounts_analyzed: number;
    material_findings_count: number;
    high_severity_issues: number;
  };
  findings: Partial<AgentV2Finding>[];
  issue_tracker?: AgentV2IssueTrackerEntry[];
  report_summary?: Partial<AgentV2ReportSummary>;
  cta_actions?: AgentV2CtaAction[];
  audit_trail?: AgentV2AuditTrail;
  engagement?: Partial<AgentV2Engagement>;
  trial_balance?: Partial<AgentV2TrialBalance>;
  parse_warnings?: ParseWarning[];
  suppressed_anomalies?: SuppressedAnomaly[];
}
