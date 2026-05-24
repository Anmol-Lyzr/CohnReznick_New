import type {
  AgentV2Finding,
  AgentV2ManagementQuestion,
  CohnReznickAdvisoryAiAnalystOutput,
  LegacyAgentV2Output,
} from "@/lib/advisory-agent-v2-types";
import type {
  AdvisoryAnalysisOutput,
  AdvisoryReport,
  FollowUpQuestion,
  IssueLogEntry,
  QuestionAgenda,
  ReviewStatusAgent,
  Severity,
  TrackerStatus,
} from "@/lib/advisory-output-types";
import { emptyQuestionAgenda, emptyReport } from "@/lib/advisory-scaffold";

type ConfidenceLevel = IssueLogEntry["confidence"];

function mapSeverity(s: AgentV2Finding["severity"] | string): Severity {
  switch (s) {
    case "critical":
    case "high":
      return "HIGH";
    case "medium":
      return "MEDIUM";
    default:
      return "LOW";
  }
}

function mapReviewStatus(s: AgentV2Finding["review_status"] | string): ReviewStatusAgent {
  switch (s) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "requires_revision":
      return "EDITED";
    default:
      return "PENDING_REVIEW";
  }
}

function mapTrackerStatus(status: string): TrackerStatus {
  const lower = status.toLowerCase();
  if (lower.includes("resolved") || lower.includes("closed")) return "RESOLVED";
  if (lower.includes("escalat")) return "ESCALATED";
  if (lower.includes("confirm")) return "CONFIRMED";
  return "PENDING";
}

function normalizePctChange(change: number): number {
  if (!Number.isFinite(change)) return 0;
  return Math.abs(change) > 1 ? change / 100 : change;
}

function formatSourceRef(trace: AgentV2Finding["source_traceability"]): string {
  if (!trace) return "";
  const rows = trace.row_numbers?.length ? ` rows ${trace.row_numbers.join(",")}` : "";
  return `${trace.file_name} · ${trace.sheet_name}${rows}`;
}

function mapManagementQuestions(finding: AgentV2Finding): FollowUpQuestion[] {
  return (finding.management_questions ?? []).map((q) => ({
    question_id: q.question_id,
    question_text: q.question_text,
    priority: Math.min(Math.max(q.priority, 1), 5) as 1 | 2 | 3 | 4 | 5,
    category: q.category,
    question_type: q.question_type,
    requires_documentation: q.requires_documentation,
    context_note: q.context_note,
    agenda_status: q.agenda_status,
  }));
}

function mapFindingToIssue(
  finding: AgentV2Finding,
  trackerByFinding: Map<string, { status: string }>
): IssueLogEntry {
  const tracker = trackerByFinding.get(finding.finding_id);
  const mom = Number.isFinite(finding.mom_pct_change)
    ? normalizePctChange(finding.mom_pct_change)
    : normalizePctChange(finding.change_percentage);

  return {
    issue_id: finding.finding_id,
    anomaly_id: finding.finding_id,
    display_order: finding.display_order,
    account_code: finding.account_code,
    account_name: finding.account_name,
    account_type: finding.account_type,
    flag_type: finding.flag_type,
    severity: mapSeverity(finding.severity),
    direction: finding.direction,
    period_start: finding.period_start || finding.period,
    period_end: finding.period_end || finding.period,
    absolute_delta: finding.absolute_delta,
    mom_pct_change: mom,
    baseline_avg: finding.baseline_avg,
    peak_value: finding.peak_value,
    z_score_estimate: finding.z_score_estimate,
    issue_summary: finding.title || finding.summary,
    driver_explanation: finding.driver_analysis.primary_driver,
    driver_category: finding.driver_analysis.driver_category,
    recurrence_type: finding.driver_analysis.recurrence_type,
    confidence: finding.driver_analysis.confidence,
    is_unexplained: finding.is_unexplained,
    needs_immediate_attention: finding.needs_immediate_attention,
    correlated_accounts: finding.correlated_accounts ?? [],
    workpaper_ref: finding.workpaper_ref,
    workpaper_excerpt: finding.workpaper_excerpt,
    follow_up_questions: mapManagementQuestions(finding),
    source_refs: finding.source_traceability
      ? [formatSourceRef(finding.source_traceability)]
      : [],
    review_status: mapReviewStatus(finding.review_status),
    reviewer_comment: finding.reviewer_comment ?? "",
    driver_status: finding.driver_analysis.driver_status,
    tracker_status: tracker
      ? mapTrackerStatus(tracker.status)
      : finding.tracker_status ?? "PENDING",
  };
}

function buildQuestionAgenda(issue_log: IssueLogEntry[]): QuestionAgenda {
  const agenda = emptyQuestionAgenda();
  for (const issue of issue_log) {
    for (const q of issue.follow_up_questions) {
      if (q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED") {
        agenda[q.category].push(q.question_text);
      }
    }
  }
  return agenda;
}

function buildReportFromAgent(
  v2: CohnReznickAdvisoryAiAnalystOutput,
  issue_log: IssueLogEntry[]
): AdvisoryReport {
  const rs = v2.report_summary;
  const report = emptyReport(rs.executive_summary);
  report.executive_summary = rs.executive_summary;
  report.issue_table = rs.issue_table.map((row) => ({
    issue_number: row.issue_number,
    account: row.account,
    period: row.period,
    movement: row.movement,
    driver: row.driver,
    severity: row.severity,
    primary_question: row.primary_question,
  }));
  report.findings_detail = rs.findings_detail.map((f) => ({
    issue_id: f.issue_id,
    observation: f.observation,
    driver: f.driver,
    implications: f.implications,
    follow_up_questions: f.follow_up_questions,
    source_refs: f.source_refs,
  }));
  report.question_agenda = buildQuestionAgenda(issue_log);
  report.workpaper_index = issue_log
    .filter((i) => i.workpaper_ref)
    .map((i) => ({
      ref: i.workpaper_ref,
      account: i.account_name,
      period: i.period_start,
      note_type: "finding",
    }));
  return report;
}

export function isAgentV2Output(value: unknown): value is CohnReznickAdvisoryAiAnalystOutput {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.agent_name === "string" &&
    obj.analysis_summary != null &&
    Array.isArray(obj.findings) &&
    typeof obj.status === "string" &&
    obj.engagement != null &&
    obj.trial_balance != null
  );
}

/** Accept extended or legacy agent JSON */
export function normalizeAgentV2Payload(raw: unknown): CohnReznickAdvisoryAiAnalystOutput | null {
  if (isAgentV2Output(raw)) return raw;

  const legacy = raw as LegacyAgentV2Output;
  if (!legacy?.agent_name || !legacy.analysis_summary || !Array.isArray(legacy.findings)) {
    return null;
  }

  const clientFallback = legacy.engagement?.client_name ?? "New Client";
  const summary = legacy.analysis_summary;

  const findings: AgentV2Finding[] = legacy.findings.map((f, i) => {
    const pct = normalizePctChange(f.change_percentage ?? 0);
    const mom = f.mom_pct_change != null ? normalizePctChange(f.mom_pct_change) : pct;
    return {
      finding_id: f.finding_id ?? `F-${i + 1}`,
      display_order: f.display_order ?? i + 1,
      title: f.title ?? f.summary ?? "",
      severity: (f.severity ?? "medium") as AgentV2Finding["severity"],
      materiality: f.materiality ?? "",
      account_name: f.account_name ?? "",
      account_code: f.account_code ?? "",
      account_type: (f.account_type ?? "Other") as AgentV2Finding["account_type"],
      period: f.period ?? "",
      period_start: f.period_start ?? f.period ?? "",
      period_end: f.period_end ?? f.period ?? "",
      change_percentage: f.change_percentage ?? 0,
      absolute_delta: f.absolute_delta ?? 0,
      mom_pct_change: mom,
      baseline_avg: f.baseline_avg ?? 0,
      peak_value: f.peak_value ?? 0,
      z_score_estimate: f.z_score_estimate ?? 0,
      flag_type: (f.flag_type ?? "TREND") as AgentV2Finding["flag_type"],
      direction: (f.direction ?? (pct >= 0 ? "UP" : "DOWN")) as "UP" | "DOWN",
      summary: f.summary ?? "",
      driver_analysis: {
        primary_driver: f.driver_analysis?.primary_driver ?? f.summary ?? "",
        confidence_score: f.driver_analysis?.confidence_score ?? 0.5,
        driver_category: (f.driver_analysis?.driver_category ?? "Other") as AgentV2Finding["driver_analysis"]["driver_category"],
        recurrence_type: (f.driver_analysis?.recurrence_type ?? "UNKNOWN") as "ONE_TIME" | "RECURRING" | "UNKNOWN",
        confidence: (f.driver_analysis?.confidence ?? "MEDIUM") as ConfidenceLevel,
        driver_status: (f.driver_analysis?.driver_status ?? "PENDING") as AgentV2Finding["driver_analysis"]["driver_status"],
      },
      is_unexplained: f.is_unexplained ?? false,
      needs_immediate_attention: f.needs_immediate_attention ?? f.severity === "high",
      correlated_accounts: f.correlated_accounts ?? [],
      management_questions: (f.management_questions ?? []).map((mq, qi) =>
        typeof mq === "string"
          ? {
              question_id: `${f.finding_id ?? `F-${i + 1}`}-Q${qi + 1}`,
              question_text: mq,
              priority: 1 as const,
              category: "Other" as const,
              question_type: "Investigative" as const,
              requires_documentation: false,
              context_note: "",
              agenda_status: "PENDING" as const,
            }
          : (mq as AgentV2ManagementQuestion)
      ),
      source_traceability: f.source_traceability ?? {
        file_name: "",
        sheet_name: "",
        row_numbers: [],
      },
      workpaper_ref: f.workpaper_ref ?? "",
      workpaper_excerpt: f.workpaper_excerpt ?? "",
      review_status: (f.review_status ?? "pending_review") as AgentV2Finding["review_status"],
      reviewer_comment: f.reviewer_comment ?? "",
      tracker_status: (f.tracker_status ?? "PENDING") as TrackerStatus,
    };
  });

  return {
    agent_name: legacy.agent_name,
    agent_role: legacy.agent_role ?? "",
    status: legacy.status,
    engagement: {
      engagement_ref: legacy.engagement?.engagement_ref ?? clientFallback,
      client_name: clientFallback,
      deal_type: legacy.engagement?.deal_type ?? "Financial Diligence",
      period_start: legacy.engagement?.period_start ?? "",
      period_end: legacy.engagement?.period_end ?? "",
      total_months: legacy.engagement?.total_months ?? summary.months_analyzed ?? 0,
      currency: legacy.engagement?.currency ?? "USD",
      materiality_threshold: legacy.engagement?.materiality_threshold ?? 50000,
      anomaly_pct_threshold: legacy.engagement?.anomaly_pct_threshold ?? 0.15,
    },
    trial_balance: {
      ingestion_status: legacy.trial_balance?.ingestion_status ?? "Processed",
      readiness_message: legacy.trial_balance?.readiness_message ?? "",
    },
    analysis_summary: {
      files_processed: summary.files_processed ?? 0,
      months_analyzed: summary.months_analyzed ?? 0,
      accounts_analyzed: summary.accounts_analyzed ?? 0,
      material_findings_count: summary.material_findings_count ?? findings.length,
      high_severity_issues: summary.high_severity_issues ?? 0,
      medium_severity_issues: summary.medium_severity_issues ?? 0,
      low_severity_issues: summary.low_severity_issues ?? 0,
      parse_warnings_count: summary.parse_warnings_count ?? 0,
      suppressed_anomalies_count: summary.suppressed_anomalies_count ?? 0,
      total_questions: summary.total_questions ?? 0,
      unexplained_count: summary.unexplained_count ?? 0,
      needs_immediate_attention_count: summary.needs_immediate_attention_count ?? 0,
      workpaper_notes_matched: summary.workpaper_notes_matched ?? summary.files_processed ?? 0,
    },
    parse_warnings: legacy.parse_warnings ?? [],
    suppressed_anomalies: legacy.suppressed_anomalies ?? [],
    findings,
    issue_tracker: legacy.issue_tracker ?? [],
    report_summary: {
      executive_summary: legacy.report_summary?.executive_summary ?? "",
      key_risks: legacy.report_summary?.key_risks ?? [],
      recommended_next_steps: legacy.report_summary?.recommended_next_steps ?? [],
      findings_detail: legacy.report_summary?.findings_detail ?? [],
      issue_table: legacy.report_summary?.issue_table ?? [],
    },
    cta_actions: legacy.cta_actions ?? [],
    audit_trail: legacy.audit_trail ?? {
      generated_by: legacy.agent_name,
      review_required: true,
      generated_timestamp: new Date().toISOString(),
      source_traceability_enabled: true,
    },
  };
}

export interface MapAgentV2Options {
  clientName: string;
  fileName?: string;
  skill?: string;
}

export function mapAgentV2ToAdvisoryAnalysis(
  v2: CohnReznickAdvisoryAiAnalystOutput,
  options: MapAgentV2Options
): AdvisoryAnalysisOutput {
  const { clientName, fileName } = options;
  const eng = v2.engagement;
  const summary = v2.analysis_summary;

  const trackerByFinding = new Map<string, { status: string }>();
  for (const entry of v2.issue_tracker ?? []) {
    trackerByFinding.set(entry.linked_finding_id, { status: entry.status });
  }

  const issue_log = (v2.findings ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((f) => mapFindingToIssue(f, trackerByFinding));

  const report = buildReportFromAgent(v2, issue_log);

  return {
    engagement: {
      engagement_ref: eng.engagement_ref,
      client_name: clientName || eng.client_name,
      deal_type: eng.deal_type,
      period_start: eng.period_start,
      period_end: eng.period_end,
      total_months: eng.total_months,
      currency: eng.currency,
      materiality_threshold: eng.materiality_threshold,
      anomaly_pct_threshold: eng.anomaly_pct_threshold,
      total_accounts_parsed: summary.accounts_analyzed,
      report_generated_at: v2.audit_trail.generated_timestamp,
    },
    parse_warnings: v2.parse_warnings ?? [],
    suppressed_anomalies: v2.suppressed_anomalies ?? [],
    issue_log,
    report,
    summary_stats: {
      total_issues: summary.material_findings_count,
      high_severity: summary.high_severity_issues,
      medium_severity: summary.medium_severity_issues,
      low_severity: summary.low_severity_issues,
      needs_immediate_attention: summary.needs_immediate_attention_count,
      unexplained: summary.unexplained_count,
      total_questions: summary.total_questions,
      suppressed_anomalies: summary.suppressed_anomalies_count,
      workpaper_notes_matched: summary.workpaper_notes_matched,
      parse_warnings: summary.parse_warnings_count,
    },
    _agent_v2_raw: v2,
    _agent_meta: {
      agent_name: v2.agent_name,
      agent_role: v2.agent_role,
      status: v2.status,
      file_name: fileName,
      cta_actions: v2.cta_actions ?? [],
      recommended_next_steps: v2.report_summary.recommended_next_steps ?? [],
      audit_trail: v2.audit_trail,
      trial_balance: v2.trial_balance,
    },
  };
}
