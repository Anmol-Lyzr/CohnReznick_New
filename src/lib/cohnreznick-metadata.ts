export const APP_METADATA = {
  title: "CohnReznick Advisory Agentic AI",
  description:
    "Agentic junior analyst prototype — 36-month trial-balance analysis with human-reviewed diligence output",
  client: "CohnReznick LLP",
  product: "Agentic junior analyst prototype",
  version: "1.0",
  preparedBy: "Lyzr AI",
  deployment:
    "Dedicated Azure instance — isolated, no cross-customer data mixing, no model training on client data",
  pocScope:
    "36-month trial-balance trend analysis with anomaly detection, driver analysis, follow-up question generation, and human-reviewed report output",
  interactionModel:
    "UI-driven agentic workbench — file upload, automated analysis, human review inbox, and report output",
};

export const CAPABILITIES = [
  {
    id: "trial-balance-ingestion",
    name: "Trial Balance Ingestion",
    description:
      "Ingest 36 months of trial-balance data across multiple files and structure into clean monthly views",
    href: "/tools/skills/trial-balance-ingestion",
    category: "Ingestion",
  },
  {
    id: "anomaly-detection",
    name: "Trend & Anomaly Detection",
    description:
      "Identify revenue, payroll, AR, cost, and margin anomalies with period-over-period deltas",
    href: "/tools/skills/anomaly-detection",
    category: "Analysis",
  },
  {
    id: "driver-analysis",
    name: "Driver Analysis",
    description:
      "Explain likely causes by cross-referencing related accounts (e.g., AR mapped to revenue decline)",
    href: "/tools/skills/driver-analysis",
    category: "Analysis",
  },
  {
    id: "follow-up-questions",
    name: "Smart Follow-Up Questions",
    description:
      "Generate prioritised, context-aware management questions ranked by materiality",
    href: "/tools/skills/follow-up-questions",
    category: "Output",
  },
  {
    id: "issue-tracker",
    name: "Dynamic Issue Tracking",
    description:
      "Log findings with severity rankings linked to source account and period",
    href: "/tools/skills/issue-tracker",
    category: "Tracking",
  },
  {
    id: "report-drafting",
    name: "Report & Workpaper Drafting",
    description:
      "Populate firm report templates with approved findings — ready for final human review",
    href: "/tools/skills/report-drafting",
    category: "Output",
  },
] as const;

export const WORKFLOW_STEPS = [
  { step: 1, actor: "Advisory Team", action: "Upload 36 months of trial-balance files", humanGate: true, skillId: "trial-balance-ingestion" },
  { step: 2, actor: "AI Agent", action: "Parse and structure data into clean monthly views", humanGate: false, skillId: "trial-balance-ingestion" },
  { step: 3, actor: "AI Agent", action: "Run trend detection across all accounts", humanGate: false, skillId: "anomaly-detection" },
  { step: 4, actor: "AI Agent", action: "Perform driver analysis on flagged movements", humanGate: false, skillId: "driver-analysis" },
  { step: 5, actor: "AI Agent", action: "Generate prioritised management follow-up questions", humanGate: false, skillId: "follow-up-questions" },
  { step: 6, actor: "AI Agent", action: "Log findings into dynamic issue tracker", humanGate: false, skillId: "issue-tracker" },
  { step: 7, actor: "Advisory Team", action: "Review findings in human-in-the-loop inbox", humanGate: true, skillId: null },
  { step: 8, actor: "AI Agent", action: "Compile approved findings into report draft", humanGate: false, skillId: "report-drafting" },
  { step: 9, actor: "Advisory Team", action: "Final review and sign-off before client delivery", humanGate: true, skillId: null },
] as const;

export const INTEGRATIONS = [
  { id: "trial-balance", name: "Trial Balance Files", category: "data", role: "Primary data source — Excel/CSV upload" },
  { id: "workpapers", name: "Supporting Workpapers", category: "data", role: "Prior-period adjustments, reclassifications, notes" },
  { id: "templates", name: "Report Templates", category: "output", role: "Word/PPT firm templates for agent population" },
  { id: "lyzr-azure", name: "Azure OpenAI / Lyzr Agent", category: "ai", role: "Core reasoning — isolated dedicated instance" },
] as const;

export const DEMO_USERS = [
  { name: "Rahul Gattani", email: "rahul.gattani@cohnreznick.com", role: "Admin" as const },
  { name: "Paul Johnson", email: "paul.johnson@cohnreznick.com", role: "Admin" as const },
  { name: "Sarah Chen", email: "sarah.chen@cohnreznick.com", role: "Editor" as const },
  { name: "Michael Torres", email: "michael.torres@cohnreznick.com", role: "Editor" as const },
  { name: "Priya Patel", email: "priya.patel@cohnreznick.com", role: "Viewer" as const },
];

export const DEMO_ENGAGEMENT = {
  client: "Horizon Logistics LLC",
  type: "Financial Diligence",
  industry: "Transportation",
  workspace: "advisory",
};
