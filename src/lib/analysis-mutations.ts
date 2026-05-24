import type {
  AdvisoryAnalysisOutput,
  AgendaStatus,
  DriverStatus,
  IssueLogEntry,
  ReviewStatusAgent,
  Severity,
  TrackerStatus,
} from "@/lib/advisory-output-types";
import type { PipelineStatus } from "@/lib/customer-management";

export interface IssueUpdatePatch {
  review_status?: ReviewStatusAgent;
  reviewer_comment?: string;
  issue_summary?: string;
  driver_explanation?: string;
  severity?: Severity;
  driver_status?: DriverStatus;
  tracker_status?: TrackerStatus;
}

export interface QuestionUpdatePatch {
  agenda_status?: AgendaStatus;
  question_text?: string;
}

export function normalizeAnalysis(analysis: AdvisoryAnalysisOutput): AdvisoryAnalysisOutput {
  return {
    ...analysis,
    issue_log: analysis.issue_log.map((issue) => ({
      ...issue,
      driver_status: issue.driver_status ?? "PENDING",
      tracker_status: issue.tracker_status ?? "PENDING",
      follow_up_questions: issue.follow_up_questions.map((q) => ({
        ...q,
        agenda_status: q.agenda_status ?? "PENDING",
      })),
    })),
  };
}

export function isAnomalyApprovedForDownstream(issue: IssueLogEntry): boolean {
  return ["APPROVED", "EDITED"].includes(issue.review_status);
}

function primaryQuestionForIssue(issue: IssueLogEntry): string {
  const included = issue.follow_up_questions.find((q) => q.agenda_status === "INCLUDED");
  if (included) return included.question_text;
  const pending = issue.follow_up_questions.find((q) => q.agenda_status === "PENDING");
  if (pending) return pending.question_text;
  return issue.follow_up_questions[0]?.question_text ?? "—";
}

function includedQuestionsForReport(issue: IssueLogEntry): string[] {
  const included = issue.follow_up_questions
    .filter((q) => q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED")
    .map((q) => q.question_text);
  if (included.length > 0) return included;
  return issue.follow_up_questions
    .filter((q) => q.agenda_status !== "EXCLUDED")
    .map((q) => q.question_text);
}

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

function formatPct(d: number): string {
  return `${(d * 100).toFixed(1)}%`;
}

function periodRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

export function recalculateSummaryStats(analysis: AdvisoryAnalysisOutput): AdvisoryAnalysisOutput["summary_stats"] {
  const active = analysis.issue_log.filter((i) => i.review_status !== "REJECTED");
  return {
    ...analysis.summary_stats,
    total_issues: active.length,
    high_severity: active.filter((i) => i.severity === "HIGH").length,
    medium_severity: active.filter((i) => i.severity === "MEDIUM").length,
    low_severity: active.filter((i) => i.severity === "LOW").length,
    needs_immediate_attention: active.filter((i) => i.needs_immediate_attention).length,
    unexplained: active.filter((i) => i.is_unexplained).length,
  };
}

/** Report draft includes only approved / edited anomalies */
export function getReportableIssues(analysis: AdvisoryAnalysisOutput): IssueLogEntry[] {
  return analysis.issue_log.filter((i) =>
    ["APPROVED", "EDITED"].includes(i.review_status)
  );
}

export function syncReportFromIssues(analysis: AdvisoryAnalysisOutput): AdvisoryAnalysisOutput {
  const normalized = normalizeAnalysis(analysis);
  const reportable = getReportableIssues(normalized).sort((a, b) => a.display_order - b.display_order);
  const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  const approved = reportable.length;

  const issue_table = reportable.map((i) => ({
    issue_number: i.issue_id,
    account: `${i.account_code} ${i.account_name}`,
    period: periodRange(i.period_start, i.period_end),
    movement: `${i.direction === "DOWN" ? "Down" : "Up"} ${formatCurrency(i.absolute_delta)} (${formatPct(i.mom_pct_change)})`,
    driver: i.driver_category.replace(/_/g, " "),
    severity: i.severity,
    primary_question: primaryQuestionForIssue(i),
  }));

  const findings_detail = reportable.map((i) => ({
    issue_id: i.issue_id,
    observation: i.issue_summary,
    driver: i.driver_explanation,
    implications:
      i.review_status === "EDITED" && i.reviewer_comment
        ? `Advisory edit: ${i.reviewer_comment}`
        : "See driver analysis and management questions for implications.",
    follow_up_questions: includedQuestionsForReport(i),
    source_refs: i.source_refs,
  }));

  const agentExecutive = analysis._agent_v2_raw?.report_summary?.executive_summary?.trim();
  const executive_summary = agentExecutive
    ? agentExecutive
    : reportable.length === 0
      ? `No approved anomalies for ${normalized.engagement.client_name}. Complete anomaly review in Anomaly Detection before report drafting. (${pending} pending review)`
      : `Diligence report draft for ${normalized.engagement.client_name}: ${approved} approved finding${approved === 1 ? "" : "s"} from anomaly detection${pending > 0 ? ` (${pending} still pending review)` : ""}.`;

  return {
    ...normalized,
    summary_stats: recalculateSummaryStats(normalized),
    report: {
      ...normalized.report,
      executive_summary,
      issue_table,
      findings_detail,
    },
  };
}

/** After live agent mapping — recalc stats only, keep agent-authored report body */
export function finalizeAgentAnalysis(analysis: AdvisoryAnalysisOutput): AdvisoryAnalysisOutput {
  if (!analysis._agent_v2_raw) return syncReportFromIssues(analysis);
  const normalized = normalizeAnalysis(analysis);
  return {
    ...normalized,
    summary_stats: recalculateSummaryStats(normalized),
  };
}

export function updateIssueInAnalysis(
  analysis: AdvisoryAnalysisOutput,
  issueId: string,
  patch: IssueUpdatePatch
): AdvisoryAnalysisOutput {
  const next: AdvisoryAnalysisOutput = {
    ...analysis,
    issue_log: analysis.issue_log.map((issue) =>
      issue.issue_id === issueId
        ? {
            ...issue,
            ...(patch.review_status != null ? { review_status: patch.review_status } : {}),
            ...(patch.reviewer_comment != null ? { reviewer_comment: patch.reviewer_comment } : {}),
            ...(patch.issue_summary != null ? { issue_summary: patch.issue_summary } : {}),
            ...(patch.driver_explanation != null ? { driver_explanation: patch.driver_explanation } : {}),
            ...(patch.severity != null ? { severity: patch.severity } : {}),
            ...(patch.driver_status != null ? { driver_status: patch.driver_status } : {}),
            ...(patch.tracker_status != null ? { tracker_status: patch.tracker_status } : {}),
          }
        : issue
    ),
  };
  return syncReportFromIssues(next);
}

export function updateQuestionInAnalysis(
  analysis: AdvisoryAnalysisOutput,
  issueId: string,
  questionId: string,
  patch: QuestionUpdatePatch
): AdvisoryAnalysisOutput {
  const next: AdvisoryAnalysisOutput = {
    ...analysis,
    issue_log: analysis.issue_log.map((issue) =>
      issue.issue_id === issueId
        ? {
            ...issue,
            follow_up_questions: issue.follow_up_questions.map((q) =>
              q.question_id === questionId
                ? {
                    ...q,
                    ...(patch.agenda_status != null ? { agenda_status: patch.agenda_status } : {}),
                    ...(patch.question_text != null ? { question_text: patch.question_text } : {}),
                  }
                : q
            ),
          }
        : issue
    ),
  };
  return syncReportFromIssues(next);
}

export function getActiveIssuesForSkill(analysis: AdvisoryAnalysisOutput): IssueLogEntry[] {
  return analysis.issue_log.filter(
    (i) => i.review_status !== "REJECTED" && isAnomalyApprovedForDownstream(i)
  );
}

export function deriveDriverPipelineStatus(analysis: AdvisoryAnalysisOutput | null): PipelineStatus {
  if (!analysis?.issue_log.length) return "not_started";
  const active = getActiveIssuesForSkill(analysis);
  if (!active.length) return "pending";
  const pending = active.filter((i) => i.driver_status === "PENDING").length;
  const validated = active.filter((i) => i.driver_status === "VALIDATED").length;
  if (pending === 0 && validated > 0) return "complete";
  if (validated > 0 || active.some((i) => i.driver_status !== "PENDING")) return "in_progress";
  return "pending";
}

export function deriveFollowUpPipelineStatus(analysis: AdvisoryAnalysisOutput | null): PipelineStatus {
  if (!analysis?.issue_log.length) return "not_started";
  const questions = analysis.issue_log
    .filter((i) => isAnomalyApprovedForDownstream(i))
    .flatMap((i) => i.follow_up_questions);
  if (!questions.length) return "pending";
  const pending = questions.filter((q) => q.agenda_status === "PENDING").length;
  const included = questions.filter((q) => q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED").length;
  if (pending === 0 && included > 0) return "complete";
  if (included > 0) return "in_progress";
  return "pending";
}

export function deriveIssueTrackerPipelineStatus(analysis: AdvisoryAnalysisOutput | null): PipelineStatus {
  if (!analysis?.issue_log.length) return "not_started";
  const active = getActiveIssuesForSkill(analysis);
  if (!active.length) return "pending";
  const open = active.filter((i) => i.tracker_status === "PENDING" || i.tracker_status === "ESCALATED").length;
  const done = active.filter((i) => i.tracker_status === "CONFIRMED" || i.tracker_status === "RESOLVED").length;
  if (open === 0 && done > 0) return "complete";
  if (done > 0) return "in_progress";
  return "pending";
}

export function driverValidationSummary(analysis: AdvisoryAnalysisOutput | null): string {
  if (!analysis) return "—";
  const active = getActiveIssuesForSkill(analysis);
  if (!active.length) return "Awaiting anomaly approval";
  const v = active.filter((i) => i.driver_status === "VALIDATED").length;
  return `${v} / ${active.length} validated`;
}

export function followUpAgendaSummary(analysis: AdvisoryAnalysisOutput | null): string {
  if (!analysis) return "—";
  const questions = analysis.issue_log
    .filter((i) => isAnomalyApprovedForDownstream(i))
    .flatMap((i) => i.follow_up_questions);
  const inc = questions.filter((q) => q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED").length;
  const def = questions.filter((q) => q.agenda_status === "DEFERRED").length;
  return `${inc} included${def > 0 ? ` · ${def} deferred` : ""}`;
}

export function issueTrackerSummary(analysis: AdvisoryAnalysisOutput | null): string {
  if (!analysis) return "—";
  const active = getActiveIssuesForSkill(analysis);
  if (!active.length) return "Awaiting anomaly approval";
  const esc = active.filter((i) => i.tracker_status === "ESCALATED").length;
  const open = active.filter((i) => i.tracker_status === "PENDING").length;
  return esc > 0 ? `${esc} escalated · ${open} open` : `${open} open`;
}

export function exportCallAgendaMarkdown(analysis: AdvisoryAnalysisOutput, clientName: string): string {
  const lines = [`# Management call agenda — ${clientName}`, "", `Generated ${new Date().toLocaleDateString("en-US")}`, ""];
  const byPriority = (p: number) =>
    analysis.issue_log
      .filter((i) => isAnomalyApprovedForDownstream(i))
      .flatMap((i) =>
        i.follow_up_questions
          .filter((q) => (q.agenda_status === "INCLUDED" || q.agenda_status === "EDITED") && q.priority === p)
          .map((q) => ({ ...q, issueId: i.issue_id }))
      );

  for (const p of [1, 2, 3, 4, 5] as const) {
    const qs = byPriority(p);
    if (!qs.length) continue;
    lines.push(`## Priority ${p}`, "");
    qs.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.question_text}`, `   - ${q.category.replace(/_/g, " ")} · ${q.issueId}`, "");
    });
  }
  return lines.join("\n");
}

export function deriveAnomalyPipelineStatus(analysis: AdvisoryAnalysisOutput | null): PipelineStatus {
  if (!analysis?.issue_log.length) return "not_started";
  const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  const reviewed = analysis.issue_log.filter((i) =>
    ["APPROVED", "EDITED", "REJECTED"].includes(i.review_status)
  ).length;
  if (pending === 0 && reviewed > 0) return "complete";
  if (reviewed > 0) return "in_progress";
  return "pending";
}

export function deriveReportDraftingStatus(analysis: AdvisoryAnalysisOutput | null): PipelineStatus {
  if (!analysis) return "not_started";
  const approved = getReportableIssues(analysis).length;
  if (approved === 0) return "pending";
  const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  if (pending > 0) return "in_progress";
  return "complete";
}

export function getFollowUpPipelineWarnings(analysis: AdvisoryAnalysisOutput): string[] {
  const warnings: string[] = [];
  const unapproved = analysis.issue_log.filter(
    (i) => i.review_status === "PENDING_REVIEW" && i.follow_up_questions.length > 0
  ).length;
  if (unapproved > 0) {
    warnings.push(
      `${unapproved} issue(s) still pending anomaly review — agenda decisions apply only after Accept/Edit in Anomaly Detection.`
    );
  }
  const highUnvalidated = analysis.issue_log.filter(
    (i) =>
      isAnomalyApprovedForDownstream(i) &&
      i.severity === "HIGH" &&
      i.driver_status !== "VALIDATED" &&
      i.follow_up_questions.length > 0
  ).length;
  if (highUnvalidated > 0) {
    warnings.push(
      `${highUnvalidated} HIGH-severity issue(s) need driver validation before those questions should go on the management call.`
    );
  }
  return warnings;
}

export function deriveDeliverStatus(analysis: AdvisoryAnalysisOutput | null): import("@/lib/customer-management").DeliverStatus {
  if (!analysis) return "draft";
  const approved = getReportableIssues(analysis).length;
  const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  const highOpen = getActiveIssuesForSkill(analysis).filter(
    (i) => i.severity === "HIGH" && (i.tracker_status === "PENDING" || i.tracker_status === "ESCALATED")
  ).length;
  if (approved > 0 && pending === 0 && highOpen === 0) return "ready";
  if (pending > 0 || highOpen > 0) return "in_review";
  if (analysis.issue_log.every((i) => i.review_status === "REJECTED")) return "blocked";
  return "draft";
}

export function anomalyReviewSummary(analysis: AdvisoryAnalysisOutput | null): string {
  if (!analysis?.issue_log.length) return "Not run";
  const a = analysis.issue_log.filter((i) => i.review_status === "APPROVED").length;
  const e = analysis.issue_log.filter((i) => i.review_status === "EDITED").length;
  const r = analysis.issue_log.filter((i) => i.review_status === "REJECTED").length;
  const p = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  return `${a + e} ok · ${r} rej · ${p} pend`;
}
