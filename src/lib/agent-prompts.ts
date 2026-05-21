/** Context bundled into Lyzr agent messages so analysis is populated without file upload */

export const TARGETCO_POC_CONTEXT = `
Engagement: TargetCo Acquisition (TAS-2025-0042), buy-side transaction diligence.
Trial balance: 847 GL accounts, USD, periods Jan-23 through Jan-26 (36 months).
Material movements to analyze:
- Revenue 4100: −18.4% MoM Jan-26 ($3.8M → $3.1M)
- Payroll 6100: +42% Mar-25 (three-payroll month, 53-week calendar)
- AR 1200: DSO 68 days Dec-25 (+28% balance build)
- Gross margin: −3.2 pts FY-25 (COGS +12% vs revenue +6%)
- SG&A 6300: +156% Nov-25 one-time legal/M&A fees
Workpapers: WP-03 payroll calendar, WP-04 legal one-time, WP-07 customer concentration, WP-12 Customer B payment terms.
`.trim();

export function buildAdvisoryAgentMessage(
  skill: string,
  engagementName: string,
  inputs: Record<string, unknown>,
  options?: { omitPocContext?: boolean }
): string {
  const omitPoc = options?.omitPocContext ?? false;
  const fileHint = inputs.fileName
    ? `Uploaded file: ${inputs.fileName}. Analyze using the file metadata and inputs provided.`
    : omitPoc
      ? "No trial balance file name was provided."
      : "Use the PoC trial balance context below (no file attached).";

  const parts = [
    `Run the ${skill.replace(/-/g, " ")} workflow for engagement "${engagementName}".`,
    fileHint,
  ];

  if (!omitPoc) {
    parts.push("", TARGETCO_POC_CONTEXT);
  }

  parts.push(
    "",
    `Inputs: ${JSON.stringify(inputs)}`,
    "",
    "Return ONLY a single valid JSON object matching the advisory_analysis_output schema:",
    "engagement, parse_warnings, suppressed_anomalies, issue_log, report, summary_stats.",
    `Set engagement.client_name to "${engagementName}".`,
    "Populate issue_log with all material findings (typically 4–6 issues), sorted by display_order.",
    "Set review_status to PENDING_REVIEW for each issue. No markdown, no code fences."
  );

  return parts.join("\n");
}

export function buildChatAgentMessage(userMessage: string): string {
  if (!userMessage.trim()) {
    return `Provide TargetCo Acquisition diligence status using advisory_analysis_output JSON.\n\n${TARGETCO_POC_CONTEXT}`;
  }
  return `${userMessage}\n\nIf producing analysis, return advisory_analysis_output JSON.\n\n${TARGETCO_POC_CONTEXT}`;
}
