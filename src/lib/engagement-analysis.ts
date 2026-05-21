import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { normalizeAnalysis } from "@/lib/analysis-mutations";
import { SAMPLE_ADVISORY_OUTPUT } from "@/lib/sample-advisory-output";
import { DEFAULT_ENGAGEMENT_NAME, ENGAGEMENT_NAMES } from "@/lib/customer-management";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** TargetCo — full PoC sample */
const TARGETCO = SAMPLE_ADVISORY_OUTPUT;

/** Horizon Logistics — transportation / fuel focus */
const HORIZON: AdvisoryAnalysisOutput = {
  ...clone(SAMPLE_ADVISORY_OUTPUT),
  engagement: {
    ...SAMPLE_ADVISORY_OUTPUT.engagement,
    engagement_ref: "HZL-2025-0118",
    client_name: "Horizon Logistics LLC",
    deal_type: "Financial Diligence",
    period_start: "Jan-24",
    period_end: "Dec-25",
    total_months: 24,
    total_accounts_parsed: 89,
    report_generated_at: "2026-05-20T10:00:00Z",
  },
  suppressed_anomalies: [
    {
      account_code: "5200",
      account_name: "Fleet Depreciation",
      period: "Q3-25",
      flag_type: "TREND",
      absolute_delta: 120000,
      suppression_reason: "New tractor capitalization schedule per fixed asset register",
    },
  ],
  issue_log: [
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[0]),
      issue_id: "ISS-H01",
      anomaly_id: "ANM-H01",
      display_order: 1,
      account_code: "4100",
      account_name: "Freight Revenue",
      issue_summary: "Freight revenue −11.2% QoQ in Q4-25 on lane rationalization",
      driver_explanation:
        "Lane rationalization removed 3 low-margin routes. Volume down 8% while rate per mile held flat. Fuel surcharge recovery lagged diesel index by ~6 weeks.",
      driver_category: "Contract",
      period_start: "Oct-25",
      period_end: "Dec-25",
      absolute_delta: -420000,
      mom_pct_change: -0.112,
      follow_up_questions: [
        {
          question_id: "Q-H01",
          question_text: "Which customer contracts were exited in Q4-25 and what is the run-rate revenue impact?",
          priority: 1,
          category: "Revenue",
          question_type: "Investigative",
          requires_documentation: true,
          context_note: "Lane exit schedule in data room folder 2.4",
          agenda_status: "PENDING",
        },
      ],
      source_refs: ["TB row 4100 · Q4-25"],
      review_status: "PENDING_REVIEW",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[1]),
      issue_id: "ISS-H02",
      anomaly_id: "ANM-H02",
      display_order: 2,
      account_code: "5100",
      account_name: "Fuel & DEF Expense",
      issue_summary: "Fuel costs +18% YoY — surcharge pass-through incomplete",
      driver_explanation:
        "Diesel index rose 18% YoY; management surcharge table updated quarterly with 6-week lag. $290K margin leakage estimated in H2-25.",
      driver_category: "Cost_Inflation",
      period_start: "Jul-25",
      period_end: "Dec-25",
      absolute_delta: 290000,
      mom_pct_change: 0.18,
      severity: "HIGH",
      follow_up_questions: [
        {
          question_id: "Q-H02",
          question_text: "What percentage of fuel cost increases were recovered via surcharge in the last two quarters?",
          priority: 1,
          category: "Cost",
          question_type: "Run_Rate",
          requires_documentation: false,
          context_note: "",
          agenda_status: "PENDING",
        },
      ],
      source_refs: ["TB row 5100 · H2-25"],
      review_status: "PENDING_REVIEW",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[2]),
      issue_id: "ISS-H03",
      anomaly_id: "ANM-H03",
      display_order: 3,
      account_code: "1500",
      account_name: "Fleet Assets (Net)",
      issue_summary: "Capex spike — 42 new tractors capitalized in Sep-25",
      driver_explanation:
        "Fleet refresh program: 42 tractors at $185K/unit. Depreciation run-rate increases $1.1M annually starting Oct-25.",
      driver_category: "Other",
      period_start: "Sep-25",
      period_end: "Sep-25",
      absolute_delta: 7770000,
      mom_pct_change: 0.34,
      severity: "MEDIUM",
      follow_up_questions: [],
      source_refs: ["Fixed asset register · Sep-25"],
      review_status: "PENDING_REVIEW",
    },
  ],
  summary_stats: {
    total_issues: 3,
    high_severity: 2,
    medium_severity: 1,
    low_severity: 0,
    needs_immediate_attention: 1,
    unexplained: 0,
    total_questions: 2,
    suppressed_anomalies: 1,
    workpaper_notes_matched: 2,
    parse_warnings: 0,
  },
  report: {
    ...clone(SAMPLE_ADVISORY_OUTPUT.report),
    executive_summary:
      "Horizon Logistics financial diligence highlights fuel surcharge leakage and Q4 freight softness following lane exits. Fleet capex program increases forward depreciation — confirm EBITDA add-backs.",
  },
};

/** Summit Retail — retail / same-store focus */
const SUMMIT: AdvisoryAnalysisOutput = {
  ...clone(SAMPLE_ADVISORY_OUTPUT),
  engagement: {
    ...SAMPLE_ADVISORY_OUTPUT.engagement,
    engagement_ref: "SMT-2026-0201",
    client_name: "Summit Retail Group",
    deal_type: "Quality of Earnings",
    period_start: "Jan-25",
    period_end: "Mar-26",
    total_months: 15,
    total_accounts_parsed: 210,
    report_generated_at: "2026-05-21T08:00:00Z",
  },
  issue_log: [
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[0]),
      issue_id: "ISS-S01",
      display_order: 1,
      account_code: "4010",
      account_name: "Same-Store Sales",
      issue_summary: "SSS −4.8% in Q1-26 — Midwest region underperformance",
      driver_explanation:
        "42 of 118 stores below plan in Midwest. Inventory shrink at 2.1% vs 1.4% chain average. Promotional depth increased 12% YoY.",
      period_start: "Jan-26",
      period_end: "Mar-26",
      absolute_delta: -890000,
      mom_pct_change: -0.048,
      severity: "HIGH",
      follow_up_questions: [
        {
          question_id: "Q-S01",
          question_text: "What corrective actions are planned for Midwest underperforming stores in Q2-26?",
          priority: 1,
          category: "Revenue",
          question_type: "Investigative",
          requires_documentation: true,
          context_note: "Store-level P&L pack requested",
          agenda_status: "PENDING",
        },
      ],
      review_status: "PENDING_REVIEW",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[1]),
      issue_id: "ISS-S02",
      display_order: 2,
      account_code: "1250",
      account_name: "Inventory",
      issue_summary: "Inventory build +$2.4M — seasonal buy ahead of Easter",
      driver_explanation:
        "Management cites Easter buy-ahead; days inventory on hand rose from 48 to 61 days. Obsolescence reserve unchanged.",
      period_start: "Feb-26",
      period_end: "Mar-26",
      absolute_delta: 2400000,
      mom_pct_change: 0.22,
      severity: "MEDIUM",
      follow_up_questions: [
        {
          question_id: "Q-S02",
          question_text: "Provide aged inventory listing and obsolescence reserve methodology for Q1-26 build.",
          priority: 2,
          category: "Working_Capital",
          question_type: "Documentation",
          requires_documentation: true,
          context_note: "",
          agenda_status: "PENDING",
        },
      ],
      review_status: "PENDING_REVIEW",
    },
  ],
  suppressed_anomalies: [],
  summary_stats: {
    total_issues: 2,
    high_severity: 1,
    medium_severity: 1,
    low_severity: 0,
    needs_immediate_attention: 1,
    unexplained: 1,
    total_questions: 2,
    suppressed_anomalies: 0,
    workpaper_notes_matched: 0,
    parse_warnings: 2,
  },
  report: {
    ...clone(SAMPLE_ADVISORY_OUTPUT.report),
    executive_summary:
      "Summit Retail Q1-26 shows same-store sales pressure and elevated inventory. Data ingestion incomplete — 15 months loaded; full 36-month TB pending client upload.",
  },
};

/** NorthBridge Manufacturing — industrial / COGS focus */
const NORTHBRIDGE: AdvisoryAnalysisOutput = {
  ...clone(SAMPLE_ADVISORY_OUTPUT),
  engagement: {
    ...SAMPLE_ADVISORY_OUTPUT.engagement,
    engagement_ref: "NBM-2025-0091",
    client_name: "NorthBridge Manufacturing",
    deal_type: "Transaction Diligence",
    period_start: "Jan-23",
    period_end: "Jan-26",
    total_accounts_parsed: 168,
    report_generated_at: "2026-05-19T16:00:00Z",
  },
  issue_log: [
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[4]),
      issue_id: "ISS-N01",
      display_order: 1,
      account_code: "6300",
      account_name: "SG&A",
      issue_summary: "SG&A increased $1.56M in Nov-25 — one-time legal and M&A fees",
      period_start: "Nov-25",
      period_end: "Nov-25",
      absolute_delta: 1560000,
      mom_pct_change: 1.56,
      severity: "HIGH",
      driver_category: "Legal",
      review_status: "APPROVED",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[0]),
      issue_id: "ISS-N02",
      display_order: 2,
      account_code: "4100",
      account_name: "Revenue",
      issue_summary: "Revenue decreased $700K in Jan-26 following sharp monthly decline",
      period_start: "Jan-26",
      period_end: "Jan-26",
      review_status: "APPROVED",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[2]),
      issue_id: "ISS-N03",
      display_order: 3,
      account_code: "1200",
      account_name: "Accounts Receivable",
      issue_summary: "AR increased $2.8M in Dec-25 — slower collections and Customer B concentration",
      period_start: "Dec-25",
      period_end: "Dec-25",
      absolute_delta: 2800000,
      review_status: "APPROVED",
    },
    {
      ...clone(SAMPLE_ADVISORY_OUTPUT.issue_log[3]),
      issue_id: "ISS-N04",
      display_order: 4,
      account_code: "5000",
      account_name: "COGS",
      account_type: "COGS",
      issue_summary: "COGS increased $1.2M during FY-25 — margin compression vs revenue",
      period_start: "Jan-25",
      period_end: "Dec-25",
      absolute_delta: 1200000,
      severity: "HIGH",
      review_status: "APPROVED",
    },
  ],
  summary_stats: {
    total_issues: 4,
    high_severity: 4,
    medium_severity: 0,
    low_severity: 0,
    needs_immediate_attention: 0,
    unexplained: 0,
    total_questions: 6,
    suppressed_anomalies: 0,
    workpaper_notes_matched: 4,
    parse_warnings: 0,
  },
  report: {
    ...clone(SAMPLE_ADVISORY_OUTPUT.report),
    executive_summary:
      "NorthBridge Manufacturing diligence complete across 36 months. Four HIGH findings approved — report draft ready for partner sign-off and client delivery.",
  },
};

const BY_CLIENT: Record<string, AdvisoryAnalysisOutput> = {
  "TargetCo Acquisition": TARGETCO,
  "Horizon Logistics LLC": HORIZON,
  "Summit Retail Group": SUMMIT,
  "NorthBridge Manufacturing": NORTHBRIDGE,
};

export function getAnalysisForEngagement(clientName: string): AdvisoryAnalysisOutput {
  const raw = BY_CLIENT[clientName] ?? BY_CLIENT[DEFAULT_ENGAGEMENT_NAME] ?? TARGETCO;
  return normalizeAnalysis(raw);
}

export function isKnownEngagement(clientName: string): boolean {
  return ENGAGEMENT_NAMES.includes(clientName);
}
