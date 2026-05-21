import type {
  AdvisoryAnalysisOutput,
  IssueLogEntry,
  ReviewStatusAgent,
  Severity,
} from "@/lib/advisory-output-types";
import type { DashboardInsight, EngagementData, ReviewFinding, ReviewStatus } from "@/lib/types";
import { DEMO_ENGAGEMENT } from "@/lib/cohnreznick-metadata";

function formatCurrency(n: number, currency = "USD"): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  if (abs >= 1_000_000) return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${prefix}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${prefix}${abs.toLocaleString()}`;
}

function formatPct(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

function periodRange(start: string, end: string): string {
  return start === end ? start : `${start} – ${end}`;
}

function severityToUi(sev: Severity): ReviewFinding["severity"] {
  if (sev === "HIGH") return "high";
  if (sev === "MEDIUM") return "medium";
  return "low";
}

function severityToInsight(sev: Severity): DashboardInsight["severity"] {
  if (sev === "HIGH") return "critical";
  if (sev === "MEDIUM") return "warning";
  return "info";
}

function reviewStatusToUi(status: ReviewStatusAgent): ReviewStatus {
  const map: Record<ReviewStatusAgent, ReviewStatus> = {
    PENDING_REVIEW: "pending",
    APPROVED: "approved",
    EDITED: "edited",
    REJECTED: "rejected",
  };
  return map[status] ?? "pending";
}

export function issueToReviewFinding(issue: IssueLogEntry): ReviewFinding {
  return {
    id: issue.issue_id,
    account: issue.account_name,
    accountCode: issue.account_code,
    period: periodRange(issue.period_start, issue.period_end),
    severity: severityToUi(issue.severity),
    headline: issue.issue_summary,
    driverSummary: issue.driver_explanation,
    sourceRef: issue.source_refs[0] ?? `${issue.account_code}`,
    status: reviewStatusToUi(issue.review_status),
    editedNote: issue.reviewer_comment || undefined,
  };
}

export function toReviewFindings(analysis: AdvisoryAnalysisOutput): ReviewFinding[] {
  return [...analysis.issue_log]
    .sort((a, b) => a.display_order - b.display_order)
    .map(issueToReviewFinding);
}

export function toDashboardInsights(analysis: AdvisoryAnalysisOutput): DashboardInsight[] {
  const issues = [...analysis.issue_log].sort((a, b) => a.display_order - b.display_order);
  const fromIssues = issues.slice(0, 4).map((issue) => ({
    id: issue.issue_id,
    severity: severityToInsight(issue.severity),
    headline: issue.issue_summary,
    summary: issue.driver_explanation.slice(0, 140) + (issue.driver_explanation.length > 140 ? "…" : ""),
    category: issue.account_type.toLowerCase(),
    actionLabel: "Review Finding",
    href: "/tools/skills/anomaly-detection",
  }));

  const pending = analysis.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length;
  if (pending > 0) {
    fromIssues.push({
      id: "review-pending",
      severity: "info",
      headline: `${pending} finding${pending === 1 ? "" : "s"} pending review`,
      summary: analysis.report.executive_summary.slice(0, 120) + "…",
      category: "review",
      actionLabel: "Open Inbox",
      href: "/tools/skills/anomaly-detection",
    });
  }

  return fromIssues;
}

export function toEngagementCard(analysis: AdvisoryAnalysisOutput): EngagementData {
  const pending = analysis.issue_log.some((i) => i.review_status === "PENDING_REVIEW");
  const approved = analysis.issue_log.some((i) =>
    ["APPROVED", "EDITED"].includes(i.review_status)
  );
  return {
    id: analysis.engagement.engagement_ref,
    client: analysis.engagement.client_name,
    type: analysis.engagement.deal_type,
    industry: DEMO_ENGAGEMENT.industry,
    lastActivity: new Date(analysis.engagement.report_generated_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    progress: {
      ingestion: true,
      anomaly: true,
      driver: true,
      questions: true,
      issues: true,
      review: !pending,
      report: approved && !pending,
    },
  };
}

export function formatSkillMarkdown(skill: string, data: AdvisoryAnalysisOutput): string {
  const { engagement: e, summary_stats: s } = data;
  const header = `# ${e.client_name} — ${skillLabel(skill)}\n*${e.engagement_ref} · ${e.period_start} – ${e.period_end} · ${e.total_accounts_parsed} accounts · ${e.currency}*\n\n---\n\n`;

  switch (skill) {
    case "trial-balance-ingestion":
      return (
        header +
        `## Ingestion Summary\n\n| Metric | Value |\n|--------|-------|\n| Engagement ref | ${e.engagement_ref} |\n| Periods | ${e.total_months} months |\n| Accounts parsed | ${e.total_accounts_parsed} |\n| Materiality threshold | ${formatCurrency(e.materiality_threshold, e.currency)} |\n| Anomaly % threshold | ${formatPct(e.anomaly_pct_threshold)} |\n| Parse warnings | ${s.parse_warnings} |\n\n## Data Quality Warnings\n\n${
          data.parse_warnings.length
            ? data.parse_warnings
                .map(
                  (w) =>
                    `- **${w.warning_type}** · ${w.account_code}${w.period ? ` · ${w.period}` : ""}: ${w.detail}`
                )
                .join("\n")
            : "_No parse warnings._"
        }\n\n*Ready for anomaly detection*`
      );

    case "anomaly-detection":
      return (
        header +
        `## Trend scan results\n\n| Metric | Value |\n|--------|-------|\n| Accounts scanned | ${e.total_accounts_parsed} |\n| Material flags | ${s.total_issues} |\n| HIGH severity | ${s.high_severity} |\n| Suppressed (documented) | ${s.suppressed_anomalies} |\n\n## Flagged movements (not issue log)\n\n| # | Account | Period | Δ $ | Δ % | Flag | Severity |\n|---|---------|--------|-----|-----|------|----------|\n${data.issue_log
          .sort((a, b) => a.display_order - b.display_order)
          .map(
            (i) =>
              `| ${i.display_order} | ${i.account_code} ${i.account_name} | ${periodRange(i.period_start, i.period_end)} | ${formatCurrency(i.absolute_delta)} | ${formatPct(i.mom_pct_change)} | **${i.flag_type}** | ${i.severity} |`
          )
          .join("\n")}\n\n## Suppressed\n\n${
          data.suppressed_anomalies.length
            ? data.suppressed_anomalies
                .map(
                  (a) =>
                    `- ${a.account_name} (${a.account_code}) · ${a.period}: ${formatCurrency(a.absolute_delta)} — _${a.suppression_reason}_`
                )
                .join("\n")
            : "_None._"
        }\n\n*Next: Driver Analysis for cross-account attribution*`
      );

    case "driver-analysis":
      return (
        header +
        data.issue_log
          .sort((a, b) => a.display_order - b.display_order)
          .map(
            (i) =>
              `## ${i.issue_id}: ${i.account_name}\n\n**Period:** ${periodRange(i.period_start, i.period_end)} · **Movement:** ${formatCurrency(i.absolute_delta)} (${formatPct(i.mom_pct_change)} MoM)\n\n${i.driver_explanation}\n\n**Driver category:** ${i.driver_category.replace(/_/g, " ")} · **Confidence:** ${i.confidence}\n\n${
                i.correlated_accounts.length
                  ? `**Correlated accounts:**\n${i.correlated_accounts.map((c) => `- ${c.account_name} (${c.account_code}) — ${c.correlation_direction}: ${c.correlation_note}`).join("\n")}`
                  : ""
              }\n\n${i.workpaper_ref ? `*${i.workpaper_ref}: ${i.workpaper_excerpt}*` : ""}`
          )
          .join("\n\n---\n\n")
      );

    case "follow-up-questions": {
      const allQ = data.issue_log.flatMap((i) => i.follow_up_questions).sort((a, b) => a.priority - b.priority);
      const byPriority = (p: number) =>
        allQ.filter((q) => q.priority === p).map((q, idx) => `${idx + 1}. ${q.question_text}`).join("\n");
      return (
        header +
        `## Critical (P1)\n\n${byPriority(1) || "_None_"}\n\n## High (P2)\n\n${byPriority(2) || "_None_"}\n\n## Medium (P3+)\n\n${allQ
          .filter((q) => q.priority >= 3)
          .map((q, idx) => `${idx + 1}. [${q.category}] ${q.question_text}`)
          .join("\n") || "_None_"}\n\n---\n\n*Grouped by priority for management diligence call*`
      );
    }

    case "issue-tracker":
      return (
        header +
        `| ID | Severity | Account | Period | Summary | Status |\n|----|----------|---------|--------|---------|--------|\n${data.issue_log
          .sort((a, b) => a.display_order - b.display_order)
          .map(
            (i) =>
              `| ${i.issue_id} | ${i.severity} | ${i.account_code} ${i.account_name} | ${periodRange(i.period_start, i.period_end)} | ${i.issue_summary} | ${i.review_status} |`
          )
          .join("\n")}\n\n## Stats\n\n- **Pending review:** ${data.issue_log.filter((i) => i.review_status === "PENDING_REVIEW").length}\n- **Needs immediate attention:** ${s.needs_immediate_attention}\n- **Unexplained:** ${s.unexplained}`
      );

    case "report-drafting": {
      const r = data.report;
      return (
        header +
        `## Executive Summary\n\n${r.executive_summary}\n\n## Issue Table\n\n| # | Account | Period | Movement | Driver | Severity |\n|---|---------|--------|----------|--------|----------|\n${r.issue_table
          .map(
            (row) =>
              `| ${row.issue_number} | ${row.account} | ${row.period} | ${row.movement} | ${row.driver} | ${row.severity} |`
          )
          .join("\n")}\n\n## Findings Detail\n\n${r.findings_detail
          .map(
            (f) =>
              `### ${f.issue_id}\n\n**Observation:** ${f.observation}\n\n**Driver:** ${f.driver}\n\n**Implications:** ${f.implications}\n\n**Questions:**\n${f.follow_up_questions.map((q) => `- ${q}`).join("\n")}`
          )
          .join("\n\n")}\n\n## Workpaper Index\n\n${r.workpaper_index.map((w) => `- **${w.ref}** · ${w.account} · ${w.period} — ${w.note_type}`).join("\n") || "_None_"}`
      );
    }

    default:
      return header + JSON.stringify(data, null, 2);
  }
}

function skillLabel(skill: string): string {
  const labels: Record<string, string> = {
    "trial-balance-ingestion": "Trial Balance Normalization Summary",
    "anomaly-detection": "Anomaly Detection Report",
    "driver-analysis": "Driver Analysis",
    "follow-up-questions": "Management Follow-Up Questions",
    "issue-tracker": "Dynamic Issue Log",
    "report-drafting": "Diligence Report Draft",
  };
  return labels[skill] ?? skill;
}
