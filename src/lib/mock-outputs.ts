import { getAnalysisForEngagement } from "@/lib/engagement-analysis";
import { DEFAULT_ENGAGEMENT_NAME } from "@/lib/customer-management";

export function getMockOutput(skill: string, inputs: Record<string, unknown>): string {
  const engagement = (inputs.engagementName as string) || DEFAULT_ENGAGEMENT_NAME;
  const analysis = getAnalysisForEngagement(engagement);
  const periodRange = (inputs.periodRange as string) || `${analysis.engagement.period_start} – ${analysis.engagement.period_end}`;
  const fileName = (inputs.fileName as string) || "trial balance file";
  const issueRows = analysis.issue_log
    .map(
      (i) =>
        `| ${i.issue_id} | ${i.severity} | ${i.account_code} ${i.account_name} | ${i.period_start} | ${i.issue_summary.slice(0, 48)}… |`
    )
    .join("\n");

  const outputs: Record<string, () => string> = {
    "trial-balance-ingestion": () => `# ${engagement} — Trial Balance Normalization Summary
*${periodRange} · Parsed and structured for analysis*

| Metric | Value |
|--------|-------|
| Accounts parsed | ${analysis.engagement.total_accounts_parsed} |
| Periods | ${analysis.engagement.total_months} months |
| Source file | ${fileName} |

*Ready for anomaly detection*`,

    "anomaly-detection": () => `# ${engagement} — Anomaly Detection Report

| ID | Severity | Account | Period | Summary |
|----|----------|---------|--------|---------|
${issueRows}

**${analysis.summary_stats.total_issues}** flagged · **${analysis.summary_stats.high_severity}** HIGH severity`,

    "driver-analysis": () => `# ${engagement} — Driver Analysis

${analysis.issue_log
  .map(
    (i, n) => `## Finding ${n + 1}: ${i.account_name}

${i.driver_explanation}
`
  )
  .join("\n")}`,

    "follow-up-questions": () => `# ${engagement} — Management Follow-Up Questions

${analysis.issue_log
  .flatMap((i) => i.follow_up_questions)
  .map((q, n) => `${n + 1}. **(${q.priority})** ${q.question_text}`)
  .join("\n") || "_No questions generated yet._"}`,

    "issue-tracker": () => `# ${engagement} — Issue Log

| ID | Severity | Account | Status |
|----|----------|---------|--------|
${analysis.issue_log.map((i) => `| ${i.issue_id} | ${i.severity} | ${i.account_name} | ${i.review_status} |`).join("\n")}`,

    "report-drafting": () => `# ${engagement} — Diligence Report Draft

## Executive Summary

${analysis.report.executive_summary}

*Draft generated from approved findings · ${new Date().toLocaleDateString("en-US")}*`,
  };

  const fn = outputs[skill];
  return fn ? fn() : `*No mock output configured for skill: ${skill}*`;
}

export const SKILL_ACTIVITIES: Record<string, Array<{ action: string; icon: string; filePath?: string }>> = {
  "trial-balance-ingestion": [
    { action: "Loading skill: trial-balance-ingestion", icon: "search", filePath: "skills/trial-balance-ingestion/SKILL.md" },
    { action: "Parsing trial balance file structure...", icon: "brain" },
    { action: "Normalizing monthly period views...", icon: "cpu" },
    { action: "Validating debit/credit balance per period...", icon: "check" },
    { action: "Saved normalized dataset to workspace", icon: "save", filePath: "workspace/advisory/trial-balance-summary.md" },
  ],
  "anomaly-detection": [
    { action: "Loading skill: anomaly-detection", icon: "search", filePath: "skills/anomaly-detection/SKILL.md" },
    { action: "Running trend detection...", icon: "brain" },
    { action: "Flagging material movements...", icon: "cpu" },
    { action: "Saved anomaly report", icon: "save", filePath: "workspace/advisory/anomaly-findings.md" },
  ],
  "driver-analysis": [
    { action: "Loading skill: driver-analysis", icon: "search", filePath: "skills/driver-analysis/SKILL.md" },
    { action: "Cross-referencing related accounts...", icon: "brain" },
    { action: "Saved driver analysis", icon: "save", filePath: "workspace/advisory/driver-analysis.md" },
  ],
  "follow-up-questions": [
    { action: "Generating management questions...", icon: "brain" },
    { action: "Saved question set", icon: "save", filePath: "workspace/advisory/follow-up-questions.md" },
  ],
  "issue-tracker": [
    { action: "Aggregating findings...", icon: "folder" },
    { action: "Saved issue log", icon: "save", filePath: "workspace/advisory/issue-log.md" },
  ],
  "report-drafting": [
    { action: "Populating report template...", icon: "brain" },
    { action: "Saved report draft", icon: "save", filePath: "workspace/advisory/diligence-report-draft.md" },
  ],
};
