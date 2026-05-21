import type { IssueLogEntry } from "@/lib/advisory-output-types";

export interface AnomalyActionProposal {
  issueId: string;
  title: string;
  category: string;
  rationale: string;
  impactIfAccepted: string;
  costOfRejection: string;
  actionItem: string;
  actionDescription: string;
  confidencePct: number;
  financialImpact: number;
  affectedCount: number;
  type: string;
}

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

function formatPct(d: number): string {
  return `${(Math.abs(d) * 100).toFixed(1)}%`;
}

function periodRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

function confidenceToPct(confidence: IssueLogEntry["confidence"], issue: IssueLogEntry): number {
  const base = confidence === "HIGH" ? 91 : confidence === "MEDIUM" ? 78 : 64;
  const bump = issue.severity === "HIGH" ? 4 : issue.severity === "MEDIUM" ? 2 : 0;
  const unexplainedPenalty = issue.is_unexplained ? 8 : 0;
  return Math.min(97, Math.max(58, base + bump - unexplainedPenalty));
}

function categoryLabel(issue: IssueLogEntry): string {
  const map: Record<string, string> = {
    SPIKE: "Material Spike",
    TREND: "Trend Deviation",
    REVERSAL: "Reversal",
    STEP_CHANGE: "Step Change",
    MARGIN_COMPRESSION: "Margin Compression",
  };
  return map[issue.flag_type] || "Anomaly Review";
}

function actionItemTitle(issue: IssueLogEntry): string {
  const period = periodRange(issue.period_start, issue.period_end);
  if (issue.needs_immediate_attention) {
    return `Escalate ${issue.severity} finding — ${issue.account_name} (${period})`;
  }
  if (issue.is_unexplained) {
    return `Investigate unexplained movement — ${issue.account_code} ${issue.account_name}`;
  }
  if (issue.workpaper_ref) {
    return `Include ${issue.workpaper_ref} finding in diligence package — ${issue.account_name}`;
  }
  return `Approve ${issue.flag_type.replace(/_/g, " ").toLowerCase()} on ${issue.account_name} for ${period}`;
}

function actionDescription(issue: IssueLogEntry): string {
  const period = periodRange(issue.period_start, issue.period_end);
  const parts = [
    `Validate agent-flagged ${formatPct(issue.mom_pct_change)} MoM movement (${formatCurrency(issue.absolute_delta)}) on account ${issue.account_code} for ${period}.`,
  ];
  if (issue.driver_explanation) {
    parts.push(issue.driver_explanation);
  }
  if (issue.workpaper_ref) {
    parts.push(`Cross-check ${issue.workpaper_ref}${issue.workpaper_excerpt ? `: ${issue.workpaper_excerpt}` : ""}.`);
  }
  if (issue.follow_up_questions.length > 0) {
    parts.push(
      `Surface ${issue.follow_up_questions.length} management follow-up question${issue.follow_up_questions.length === 1 ? "" : "s"} in the diligence call agenda.`
    );
  }
  return parts.join(" ");
}

function buildRationale(issue: IssueLogEntry): string {
  const period = periodRange(issue.period_start, issue.period_end);
  return [
    `${issue.severity} severity ${issue.flag_type.replace(/_/g, " ")} on ${issue.account_name} (${issue.account_code}) in ${period}.`,
    issue.issue_summary,
    issue.driver_explanation ? `Driver context: ${issue.driver_explanation}` : null,
    issue.is_unexplained ? "Movement remains partially unexplained — human validation recommended before client delivery." : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildImpactIfAccepted(issue: IssueLogEntry): string {
  const period = periodRange(issue.period_start, issue.period_end);
  const downstream = [
    "Included in Report Drafting and the client-facing diligence report with full source traceability",
    "Logged in Issue Tracker with severity and workpaper references preserved",
    issue.follow_up_questions.length > 0
      ? `${issue.follow_up_questions.length} follow-up question(s) added to the management discussion agenda`
      : null,
    issue.correlated_accounts.length > 0
      ? `Driver analysis links retained for ${issue.correlated_accounts.length} correlated account(s)`
      : null,
    "Customer Management deliver status advances when all material anomalies are reviewed",
  ].filter(Boolean);

  return `Finding ${issue.issue_id} (${formatCurrency(issue.absolute_delta)} · ${period}) will be treated as a reportable diligence item. ${downstream.join("; ")}.`;
}

function buildCostOfRejection(issue: IssueLogEntry): string {
  const material = issue.severity === "HIGH" || Math.abs(issue.absolute_delta) >= 250_000;
  const risks = [
    "Excluded from Report Drafting, Issue Tracker roll-forward, and management question packs",
    material
      ? `Material ${issue.severity} movement (${formatCurrency(issue.absolute_delta)}) may be omitted from the diligence narrative — elevates misstatement and scope risk if the variance is valid`
      : "Downstream skills will not reference this flag; pipeline may show fewer open items than the TB supports",
    issue.needs_immediate_attention
      ? "Immediate-attention flag suppressed — partner review may not see this movement before client delivery"
      : null,
    issue.is_unexplained
      ? "Unexplained variance left undocumented in the client package — weaker defensibility in management discussions"
      : null,
    "Rejected items remain in the audit trail but do not count toward approved findings or ready-to-deliver status",
  ].filter(Boolean);

  return risks.join(". ") + ".";
}

/** Proposal-style action metadata for human-in-the-loop anomaly review */
export function buildAnomalyActionProposal(issue: IssueLogEntry): AnomalyActionProposal {
  const affectedCount =
    issue.correlated_accounts.length +
    issue.follow_up_questions.length +
    (issue.workpaper_ref ? 1 : 0);

  return {
    issueId: issue.issue_id,
    title: issue.issue_summary,
    category: categoryLabel(issue),
    rationale: buildRationale(issue),
    impactIfAccepted: buildImpactIfAccepted(issue),
    costOfRejection: buildCostOfRejection(issue),
    actionItem: actionItemTitle(issue),
    actionDescription: actionDescription(issue),
    confidencePct: confidenceToPct(issue.confidence, issue),
    financialImpact: Math.abs(issue.absolute_delta),
    affectedCount: Math.max(1, affectedCount),
    type: `ANOMALY_${issue.flag_type}`,
  };
}

export function getDecisionOutcomeMessage(
  status: IssueLogEntry["review_status"],
  proposal: AnomalyActionProposal
): string | null {
  if (status === "APPROVED") {
    return `Accepted — ${proposal.impactIfAccepted}`;
  }
  if (status === "EDITED") {
    return `Edited and accepted — summary updated; ${proposal.impactIfAccepted}`;
  }
  if (status === "REJECTED") {
    return `Rejected — ${proposal.costOfRejection}`;
  }
  return null;
}
