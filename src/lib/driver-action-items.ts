import type { IssueLogEntry } from "@/lib/advisory-output-types";
import type { SkillActionProposal } from "@/lib/skill-action-types";

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

export function buildDriverActionProposal(issue: IssueLogEntry): SkillActionProposal {
  const period = periodRange(issue.period_start, issue.period_end);
  const correlated = issue.correlated_accounts.length;

  return {
    title: issue.issue_summary,
    category: issue.driver_category.replace(/_/g, " "),
    rationale: [
      `${issue.severity} ${issue.flag_type.replace(/_/g, " ")} on ${issue.account_name} (${period}).`,
      issue.driver_explanation,
      issue.workpaper_ref
        ? `Supporting workpaper ${issue.workpaper_ref}: ${issue.workpaper_excerpt}`
        : null,
      correlated > 0
        ? `${correlated} correlated account(s) identified (${issue.correlated_accounts.map((c) => c.account_code).join(", ")}).`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    impactIfAccepted: `Driver narrative for ${issue.issue_id} will be treated as validated. Follow-up questions for this finding remain on the management agenda; issue tracker can show driver supported; report draft may cite ${issue.driver_category.replace(/_/g, " ")}${issue.workpaper_ref ? ` and ${issue.workpaper_ref}` : ""}.`,
    costOfRejection: `If challenged or marked insufficient evidence, question pack for ${issue.account_name} may be held pending rework. Issue may remain flagged as unexplained risk; Customer Management driver step stays incomplete for this finding until resolved.`,
    actionItem: `Validate cross-account driver — ${issue.account_name}`,
    actionDescription: `Confirm agent attribution for ${formatPct(issue.mom_pct_change)} MoM movement (${formatCurrency(issue.absolute_delta)}) on ${issue.account_code}. Review correlated accounts and workpaper support before management questions proceed.`,
    metrics: [
      { label: "Confidence", value: issue.confidence },
      { label: "Financial impact", value: formatCurrency(issue.absolute_delta) },
      { label: "Correlated", value: String(Math.max(1, correlated)) },
    ],
    type: `DRIVER_${issue.driver_category}`,
  };
}

export function getDriverOutcomeMessage(
  status: IssueLogEntry["driver_status"],
  proposal: SkillActionProposal
): string | null {
  if (status === "VALIDATED") return `Validated — ${proposal.impactIfAccepted}`;
  if (status === "CHALLENGED" || status === "INSUFFICIENT") return `Marked ${status.toLowerCase()} — ${proposal.costOfRejection}`;
  return null;
}
