import type { IssueLogEntry } from "@/lib/advisory-output-types";
import type { SkillActionProposal } from "@/lib/skill-action-types";

function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

function periodRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

const REVIEW_LABELS: Record<IssueLogEntry["review_status"], string> = {
  PENDING_REVIEW: "Pending anomaly review",
  APPROVED: "Accepted in anomaly review",
  EDITED: "Edited & accepted",
  REJECTED: "Rejected in anomaly review",
};

export function buildTrackerActionProposal(issue: IssueLogEntry): SkillActionProposal {
  const period = periodRange(issue.period_start, issue.period_end);

  return {
    title: issue.issue_summary,
    category: `Issue log · ${issue.severity}`,
    rationale: [
      `${issue.issue_id}: ${issue.severity} finding on ${issue.account_name} (${period}), movement ${formatCurrency(issue.absolute_delta)}.`,
      `Anomaly review: ${REVIEW_LABELS[issue.review_status]}. Driver status: ${issue.driver_status}.`,
      issue.source_refs.length ? `Sources: ${issue.source_refs.join("; ")}.` : null,
      issue.needs_immediate_attention ? "Flagged for immediate attention." : null,
    ]
      .filter(Boolean)
      .join(" "),
    impactIfAccepted: `Disposition updates the engagement issue log. Confirmed or resolved items count toward closed findings; escalated items surface for partner review and may block ready-to-deliver status when HIGH severity remains open.`,
    costOfRejection: `Leaving disposition open keeps the finding in the open queue. Deliver status on Customer Management may remain in review when HIGH items lack confirmed resolution or escalation.`,
    actionItem: `Issue disposition — ${issue.issue_id}`,
    actionDescription: `Confirm the finding is correctly logged, escalate to partner, or mark resolved after workpaper / management response. Anomaly accept/reject is read-only here — use Anomaly Detection to change report inclusion.`,
    metrics: [
      { label: "Severity", value: issue.severity },
      { label: "Financial impact", value: formatCurrency(issue.absolute_delta) },
      { label: "Immediate", value: issue.needs_immediate_attention ? "Yes" : "No" },
    ],
    type: `TRACKER_${issue.severity}`,
  };
}

export function getTrackerOutcomeMessage(
  status: IssueLogEntry["tracker_status"],
  proposal: SkillActionProposal
): string | null {
  if (status === "CONFIRMED" || status === "RESOLVED") return `${status} — ${proposal.impactIfAccepted}`;
  if (status === "ESCALATED") return `Escalated — ${proposal.costOfRejection}`;
  return null;
}
