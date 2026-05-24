import type {
  AdvisoryAnalysisOutput,
  AdvisoryReport,
  EngagementMeta,
  IssueLogEntry,
  QuestionAgenda,
} from "@/lib/advisory-output-types";

export function emptyQuestionAgenda(): QuestionAgenda {
  return { Revenue: [], Cost: [], Working_Capital: [], Payroll: [], Legal: [], Other: [] };
}

export function emptyReport(executiveSummary: string): AdvisoryReport {
  return {
    executive_summary: executiveSummary,
    issue_table: [],
    findings_detail: [],
    question_agenda: emptyQuestionAgenda(),
    workpaper_index: [],
  };
}

type IssueInput = Partial<IssueLogEntry> &
  Pick<
    IssueLogEntry,
    | "issue_id"
    | "anomaly_id"
    | "display_order"
    | "account_code"
    | "account_name"
    | "issue_summary"
    | "driver_explanation"
  >;

export function createIssue(input: IssueInput): IssueLogEntry {
  return {
    account_type: "Revenue",
    flag_type: "SPIKE",
    severity: "HIGH",
    direction: "DOWN",
    period_start: "",
    period_end: "",
    absolute_delta: 0,
    mom_pct_change: 0,
    baseline_avg: 0,
    peak_value: 0,
    driver_category: "Other",
    recurrence_type: "UNKNOWN",
    confidence: "MEDIUM",
    is_unexplained: false,
    needs_immediate_attention: false,
    correlated_accounts: [],
    workpaper_ref: "",
    workpaper_excerpt: "",
    follow_up_questions: [],
    source_refs: [],
    review_status: "PENDING_REVIEW",
    reviewer_comment: "",
    driver_status: "PENDING",
    tracker_status: "PENDING",
    ...input,
  };
}

export function baseEngagementMeta(
  partial: Pick<EngagementMeta, "engagement_ref" | "client_name" | "deal_type" | "period_start" | "period_end" | "total_months" | "total_accounts_parsed" | "report_generated_at">
): EngagementMeta {
  return {
    currency: "USD",
    materiality_threshold: 50000,
    anomaly_pct_threshold: 0.15,
    ...partial,
  };
}

export function buildAnalysis(
  engagement: EngagementMeta,
  issue_log: IssueLogEntry[],
  report: AdvisoryReport,
  summary_stats: AdvisoryAnalysisOutput["summary_stats"],
  overrides?: Partial<Pick<AdvisoryAnalysisOutput, "parse_warnings" | "suppressed_anomalies">>
): AdvisoryAnalysisOutput {
  return {
    engagement,
    parse_warnings: overrides?.parse_warnings ?? [],
    suppressed_anomalies: overrides?.suppressed_anomalies ?? [],
    issue_log,
    report,
    summary_stats,
  };
}
