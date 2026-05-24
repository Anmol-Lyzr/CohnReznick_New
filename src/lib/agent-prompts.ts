/** Context bundled into Lyzr agent messages so analysis is populated without file upload */

export const DEFAULT_POC_CONTEXT = `
Engagement: Horizon Logistics LLC (HZL-2025-0118), financial diligence.
Trial balance: 89 GL accounts, USD, periods Jan-24 through Dec-25 (24 months).
Material movements to analyze:
- Freight revenue 4100: −11.2% QoQ Q4-25 on lane rationalization
- Fuel & DEF 5100: +18% YoY — surcharge pass-through lag
- Fleet assets 1500: capex spike Sep-25 (42 tractors)
Workpapers: fixed asset register, fuel surcharge schedule, lane exit schedule.
`.trim();

const V2_SCHEMA_HINT = `
Return ONLY a single valid JSON object matching cohnreznick_advisory_ai_analyst (strict extended schema).
Required top-level keys: agent_name, agent_role, status, engagement, trial_balance, analysis_summary,
parse_warnings, suppressed_anomalies, findings, issue_tracker, report_summary, cta_actions, recommended_next_steps, audit_trail.

engagement: client_name, engagement_id, period_label, currency, industry (from TB / user context).
trial_balance: ingestion_status, readiness_message (and file metadata from upload).
analysis_summary: total_accounts, periods_analyzed, anomalies_detected, high_risk_count, materiality_threshold, narrative.
findings: each with id, title, category, severity, account_codes, amounts, mom_pct_change, z_score_estimate,
review_status (pending_review), narrative, evidence_refs, recommended_action.
report_summary: executive_summary, issue_table[], findings_detail[] aligned with findings.
Populate every field from the uploaded trial balance — no placeholder or demo client names.
No markdown, no code fences, no prose outside JSON.
Schema reference path in repo: public/schemas/cohnreznick_advisory_ai_analyst.schema.json
`.trim();

export function buildAdvisoryAgentMessage(
  skill: string,
  engagementName: string,
  inputs: Record<string, unknown>,
  options?: { omitPocContext?: boolean; tbPreview?: string }
): string {
  const omitPoc = options?.omitPocContext ?? false;
  const fileHint = inputs.fileName
    ? `Uploaded trial balance file: ${inputs.fileName}. Analyze the attached asset and/or data preview below.`
    : omitPoc
      ? "No trial balance file was attached."
      : "Use the PoC trial balance context below (no file attached).";

  const parts = [
    `Run the ${skill.replace(/-/g, " ")} workflow for engagement "${engagementName}".`,
    fileHint,
  ];

  if (!omitPoc) {
    parts.push("", DEFAULT_POC_CONTEXT);
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
  } else {
    parts.push(
      "",
      `Inputs: ${JSON.stringify(inputs)}`,
      "",
      V2_SCHEMA_HINT,
      `Use client name "${engagementName}" in audit_trail and source traceability file references where applicable.`
    );
    if (options?.tbPreview) {
      parts.push("", "## Trial balance data preview", options.tbPreview);
    }
  }

  return parts.join("\n");
}

export function buildChatAgentMessage(userMessage: string): string {
  if (!userMessage.trim()) {
    return `Provide Horizon Logistics LLC diligence status using advisory_analysis_output JSON.\n\n${DEFAULT_POC_CONTEXT}`;
  }
  return `${userMessage}\n\nIf producing analysis, return advisory_analysis_output JSON.\n\n${DEFAULT_POC_CONTEXT}`;
}
