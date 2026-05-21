export function getMockOutput(skill: string, inputs: Record<string, unknown>): string {
  const engagement = (inputs.engagementName as string) || "TargetCo Acquisition";
  const periodRange = (inputs.periodRange as string) || "36 months";

  const outputs: Record<string, () => string> = {
    "trial-balance-ingestion": () => `# ${engagement} — Trial Balance Normalization Summary
*${periodRange} · Parsed and structured for analysis*

---

## Ingestion Summary

| Metric | Value |
|--------|-------|
| Files processed | ${inputs.fileName ? "1" : "1 (PoC sample)"} |
| Periods normalized | 36 monthly views |
| Accounts mapped | 847 GL accounts |
| Data quality score | 98.2% |

## Monthly View (excerpt)

| Account Code | Account Name | Jan 2024 | Dec 2025 | Jan 2026 |
|--------------|--------------|----------|----------|----------|
| 4100 | Revenue — Product Sales | $4.2M | $3.8M | $3.1M |
| 1200 | Accounts Receivable | $1.8M | $2.4M | $2.6M |
| 6100 | Payroll Expense | $890K | $920K | $1.31M |
| 5100 | COGS | $2.1M | $2.3M | $2.4M |

## Validation Notes

- All debit/credit entries balanced per period
- Period labels aligned to calendar months
- Supporting workpaper cross-references indexed

*Source: CohnReznick_TB_Input_File_v2.xlsx · Ready for anomaly detection*`,

    "anomaly-detection": () => `# ${engagement} — Anomaly Detection Report
*Material movements flagged across revenue, payroll, AR, costs, and margins*

---

## Flagged Anomalies (Top 5)

| # | Account | Period | Δ MoM | Severity | Source |
|---|---------|--------|-------|----------|--------|
| 1 | Revenue — Product Sales (4100) | Jan 2026 | −18.4% | Critical | TB row 4100 |
| 2 | Payroll Expense (6100) | Mar 2025 | +42.0% | High | TB row 6100 |
| 3 | Accounts Receivable (1200) | Dec 2025 | +28.3% | High | TB row 1200 |
| 4 | Gross Margin % | FY 2025 | −3.2 pts | Medium | Derived |
| 5 | SG&A — Prof. Fees (6300) | Nov 2025 | +156% | Low | TB row 6300 |

## Statistical Summary

- **Accounts analyzed:** 847
- **Material movements flagged:** 23
- **False positive estimate:** <8% (PoC threshold)

## Focus Areas Scanned

${((inputs.focusAreas as string[]) || ["Revenue", "Payroll", "AR", "Costs", "Margin"]).map((a) => `- ${a}`).join("\n")}

*Proceed to Driver Analysis for cross-account explanations*`,

    "driver-analysis": () => `# ${engagement} — Driver Analysis
*Cross-referenced explanations for flagged movements*

---

## Finding 1: Revenue Decline (Jan 2026)

**Account:** 4100 — Revenue — Product Sales  
**Movement:** −18.4% MoM ($3.8M → $3.1M)

**Likely drivers:**
1. AR balance decreased −$2.1M in same period — suggests collection acceleration, not new sales
2. Top customer concentration: Customer A orders down 34% per shipment log
3. Seasonal adjustment insufficient for Q1 post-holiday slowdown

**Related accounts:** 1200 (AR), 4100 (Revenue), 5100 (COGS)

---

## Finding 2: Payroll Spike (Mar 2025)

**Account:** 6100 — Payroll Expense  
**Movement:** +42% vs trailing 6-month average

**Likely drivers:**
1. **Three-payroll month** — 53-week fiscal calendar (documented in workpaper WP-03)
2. Bonus accrual true-up of $180K released in March
3. Headcount increase: 12 FTEs added in Feb 2025 (partial month effect)

**Related accounts:** 6100 (Payroll), 2150 (Accrued Payroll)

---

## Finding 3: AR DSO Expansion (Dec 2025)

**Account:** 1200 — Accounts Receivable  
**Movement:** DSO 52 → 68 days

**Likely drivers:**
1. Revenue recognition timing mismatch with collections
2. Customer B payment terms extended 30→60 days (Nov 2025)
3. No bad debt reserve increase despite aging bucket shift

*Source traceability: TB rows + Supporting Workpapers WP-07, WP-12*`,

    "follow-up-questions": () => `# ${engagement} — Management Follow-Up Questions
*Prioritised by materiality — formatted for diligence call*

---

## Critical Priority

1. **Revenue decline (Jan 2026):** What specific customer contracts or product lines drove the −18.4% MoM decline? Is this expected to persist through Q1?

2. **AR vs revenue disconnect:** Collections improved while revenue fell — were there large pre-payments or factoring arrangements not reflected in revenue?

## High Priority

3. **Payroll spike (Mar 2025):** Please confirm the three-payroll month treatment and whether bonus accrual true-up was a one-time event or recurring.

4. **DSO expansion:** What is management's plan to address Customer B's extended payment terms? Any covenant implications?

## Medium Priority

5. **Margin compression:** What percentage of raw material cost increases have been passed through to customers in the last 12 months?

6. **Normalized EBITDA:** Confirm SG&A legal fees ($6300, Nov 2025) are excluded from management's normalized EBITDA bridge.

---

*${((inputs.questionCount as string) || "12")} questions generated · 0 redundant with prior management responses (per workpaper index)*`,

    "issue-tracker": () => `# ${engagement} — Dynamic Issue Log
*Severity-ranked findings with source traceability*

---

| ID | Severity | Account | Period | Issue | Source | Status |
|----|----------|---------|--------|-------|--------|--------|
| ISS-001 | Critical | 4100 Revenue | Jan 2026 | Revenue decline −18.4% MoM | TB row 4100 | Open |
| ISS-002 | High | 6100 Payroll | Mar 2025 | Three-payroll month spike | TB row 6100 | Open |
| ISS-003 | High | 1200 AR | Dec 2025 | DSO expansion to 68 days | TB row 1200 | Open |
| ISS-004 | Medium | GM% | FY 2025 | Margin compression −3.2 pts | Derived | Open |
| ISS-005 | Low | 6300 SG&A | Nov 2025 | One-time legal fees | TB row 6300 | Closed |

## Summary

- **Open issues:** 4
- **Pending human review:** 4
- **Approved for report:** 1

*All issues require Anomaly Detection approval before client-facing inclusion*`,

    "report-drafting": () => `# ${engagement} — Diligence Report Draft
*Populated from approved findings · CohnReznick template structure*

---

## Executive Summary

Transaction diligence analysis of TargetCo over ${periodRange} identifies **4 material findings** requiring management follow-up, centered on revenue softness, payroll normalization, and working capital trends.

## Key Findings (Approved)

### 1. Revenue Trend Deterioration
Product sales revenue declined 18.4% month-over-month in January 2026, with correlated AR movements suggesting demand softness rather than collection timing alone.

### 2. Payroll Normalization
March 2025 payroll spike attributable to three-payroll month; normalized run-rate estimated at $920K/month post-adjustment.

### 3. Working Capital
AR days outstanding expanded to 68 days in December 2025, driven primarily by Customer B payment term extension.

## Management Questions Appendix

See Section 4 — 6 prioritised questions for management discussion (2 critical, 3 high, 1 medium).

## Next Steps

- [ ] Advisory team final sign-off (Step 9)
- [ ] Client delivery upon approval

---

*Template: CohnReznick_Diligence_Report_Template.docx · Draft v0.1 · ${new Date().toLocaleDateString("en-US")}*`,
  };

  const fn = outputs[skill];
  return fn ? fn() : `*No mock output configured for skill: ${skill}*`;
}

export const SKILL_ACTIVITIES: Record<string, Array<{ action: string; icon: string; filePath?: string }>> = {
  "trial-balance-ingestion": [
    { action: "Loading skill: trial-balance-ingestion", icon: "search", filePath: "skills/trial-balance-ingestion/SKILL.md" },
    { action: "Reading SOUL.md and RULES.md", icon: "file", filePath: "SOUL.md" },
    { action: "Loading knowledge: diligence methodology", icon: "folder", filePath: "knowledge/docs/diligence-methodology.md" },
    { action: "Parsing trial balance file structure...", icon: "brain" },
    { action: "Normalizing 36 monthly period views...", icon: "cpu" },
    { action: "Validating debit/credit balance per period...", icon: "check" },
    { action: "Saved normalized dataset to workspace", icon: "save", filePath: "workspace/cohnreznick-poc/trial-balance-summary.md" },
  ],
  "anomaly-detection": [
    { action: "Loading skill: anomaly-detection", icon: "search", filePath: "skills/anomaly-detection/SKILL.md" },
    { action: "Loading normalized TB dataset", icon: "folder", filePath: "workspace/cohnreznick-poc/trial-balance-summary.md" },
    { action: "Running trend detection across 847 accounts...", icon: "brain" },
    { action: "Flagging material period-over-period movements...", icon: "cpu" },
    { action: "Ranking anomalies by severity...", icon: "check" },
    { action: "Saved anomaly report", icon: "save", filePath: "workspace/cohnreznick-poc/anomaly-findings.md" },
  ],
  "driver-analysis": [
    { action: "Loading skill: driver-analysis", icon: "search", filePath: "skills/driver-analysis/SKILL.md" },
    { action: "Loading anomaly findings", icon: "folder", filePath: "workspace/cohnreznick-poc/anomaly-findings.md" },
    { action: "Cross-referencing related accounts...", icon: "brain" },
    { action: "Mapping AR movements to revenue trends...", icon: "cpu" },
    { action: "Attributing payroll spike to three-payroll month", icon: "check" },
    { action: "Saved driver analysis", icon: "save", filePath: "workspace/cohnreznick-poc/driver-analysis.md" },
  ],
  "follow-up-questions": [
    { action: "Loading skill: follow-up-questions", icon: "search", filePath: "skills/follow-up-questions/SKILL.md" },
    { action: "Loading driver analysis and workpapers", icon: "folder", filePath: "workspace/cohnreznick-poc/driver-analysis.md" },
    { action: "Generating context-aware management questions...", icon: "brain" },
    { action: "Filtering redundant / already-answered questions...", icon: "cpu" },
    { action: "Ranking by materiality...", icon: "check" },
    { action: "Saved question set", icon: "save", filePath: "workspace/cohnreznick-poc/follow-up-questions.md" },
  ],
  "issue-tracker": [
    { action: "Loading skill: issue-tracker", icon: "search", filePath: "skills/issue-tracker/SKILL.md" },
    { action: "Aggregating findings from prior steps...", icon: "folder" },
    { action: "Assigning severity rankings...", icon: "brain" },
    { action: "Linking issues to source accounts and periods...", icon: "cpu" },
    { action: "Saved issue log", icon: "save", filePath: "workspace/cohnreznick-poc/issue-log.md" },
  ],
  "report-drafting": [
    { action: "Loading skill: report-drafting", icon: "search", filePath: "skills/report-drafting/SKILL.md" },
    { action: "Loading approved findings from review inbox", icon: "folder" },
    { action: "Loading CohnReznick report template", icon: "file", filePath: "templates/CohnReznick_Diligence_Report_Template.docx" },
    { action: "Populating findings into template sections...", icon: "brain" },
    { action: "Drafting executive summary and appendices...", icon: "cpu" },
    { action: "Saved report draft", icon: "save", filePath: "workspace/cohnreznick-poc/diligence-report-draft.md" },
  ],
};
