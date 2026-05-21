import type { ReviewFinding } from "@/lib/types";

export const INITIAL_REVIEW_FINDINGS: ReviewFinding[] = [
  {
    id: "f1",
    account: "Revenue — Product Sales",
    accountCode: "4100",
    period: "Jan 2026",
    severity: "critical",
    headline: "Revenue decline −18.4% MoM",
    driverSummary:
      "Decline correlates with AR balance drop (−$2.1M) and reduced shipment volume noted in supporting workpapers.",
    sourceRef: "TB row 4100 · Jan 2026",
    status: "pending",
  },
  {
    id: "f2",
    account: "Payroll Expense",
    accountCode: "6100",
    period: "Mar 2025",
    severity: "high",
    headline: "Payroll spike +42% vs trailing average",
    driverSummary:
      "Three-payroll month detected (53-week calendar). Cross-check with Mar 2025 accrual reversal in workpapers.",
    sourceRef: "TB row 6100 · Mar 2025",
    status: "pending",
  },
  {
    id: "f3",
    account: "Accounts Receivable",
    accountCode: "1200",
    period: "Dec 2025",
    severity: "high",
    headline: "AR days outstanding increased to 68 days",
    driverSummary:
      "DSO expansion driven by top-3 customer payment delays; maps to revenue softness in Q4 2025.",
    sourceRef: "TB row 1200 · Dec 2025",
    status: "pending",
  },
  {
    id: "f4",
    account: "Gross Margin %",
    accountCode: "GM",
    period: "FY 2025",
    severity: "medium",
    headline: "Margin compression −3.2 pts YoY",
    driverSummary:
      "COGS growth (+12%) outpaced revenue growth (+6%). Raw materials cost pass-through incomplete.",
    sourceRef: "Derived · FY 2025",
    status: "pending",
  },
  {
    id: "f5",
    account: "SG&A — Professional Fees",
    accountCode: "6300",
    period: "Nov 2025",
    severity: "low",
    headline: "One-time legal advisory fees",
    driverSummary: "Non-recurring M&A transaction costs; excluded from normalized EBITDA per workpaper note 4.2.",
    sourceRef: "TB row 6300 · Nov 2025",
    status: "approved",
  },
];
