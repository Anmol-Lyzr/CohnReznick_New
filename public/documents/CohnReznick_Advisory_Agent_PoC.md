  
![Lyzr][image1]

**Prototype Design Document**

**CohnReznick**

*Advisory Agentic AI — Junior Analyst Automation*

Prepared for:

**CohnReznick LLP**

Prepared by:

**Lyzr AI**

Version 1.0  |  20 May 2026

# **1\. Overview**

| Field | Details |
| :---- | :---- |
| **Client** | CohnReznick LLP |
| **Who They Are** | Top-20 US advisory, assurance, and tax firm serving middle-market and high-growth companies across multiple industries |
| **What They Do** | Deliver transaction advisory, financial diligence, audit, and tax services — with advisory teams executing large volumes of repeatable financial analysis across client engagements |
| **Pain Point** | 50–60% of every advisory engagement consists of repeatable, analyst-level tasks — trial-balance analysis, trend detection, issue tracking, follow-up question prep, and workpaper assembly — all currently done manually by associates and senior analysts |
| **Product Being Built** | Agentic junior analyst prototype — an AI agent that ingests trial-balance data, detects anomalies, explains drivers, generates management follow-up questions, and drafts diligence output, with human review at every client-facing step |
| **Primary Users** | Advisory team members — Rahul Gattani, Paul Johnson, and the broader transaction advisory practice |
| **Demo Audience** | Rahul Gattani and Paul Johnson (validation) → Margaret and Claudine (leadership) → COO (final approval) |
| **Interaction Model** | UI-driven agentic workbench — file upload, automated analysis, human review inbox, and report output |
| **Deployment** | Dedicated Azure instance — isolated, no cross-customer data mixing, no model training on client data |
| **Platform & Language** | Web Application — English (US) |
| **PoC Scope** | 36-month trial-balance trend analysis with anomaly detection, driver analysis, follow-up question generation, and human-reviewed report output |

# **2\. Product Overview**

The CohnReznick Advisory Agent is an agentic junior analyst built on Lyzr AI. It is not a Copilot-style prompting tool — it executes multi-step analyst workflows autonomously, from ingesting raw trial-balance data through to producing a reviewed, client-ready diligence package. Human judgment is preserved through a mandatory review inbox before any output reaches a client.

The PoC is scoped around a single high-value workflow: 36-month trial-balance analysis for transaction diligence. This is the use case Rahul and Paul identified as the strongest demonstration of agentic reasoning versus basic AI prompting.

| Capability | Description |
| :---- | :---- |
| **Trial Balance Ingestion** | Agent ingests 36 months of trial-balance data across multiple files and structures it into clean monthly views for analysis |
| **Trend & Anomaly Detection** | Automatically identifies revenue, payroll, AR, cost, and margin anomalies across the time series and flags statistically significant movements |
| **Driver Analysis** | Explains likely causes of detected trends by cross-referencing related accounts (e.g., AR movement mapped to revenue decline; payroll spikes matched to three-payroll months) |
| **Smart Follow-Up Questions** | Generates prioritised, context-aware management questions a junior analyst would normally prepare — avoiding naive or already-answered questions |
| **Dynamic Issue Tracking** | Logs all identified findings with severity rankings and links each issue to the relevant source account and period |
| **Human-in-the-Loop Review** | Reviewer inbox where advisory team approves, edits, or rejects each finding before it is included in client-facing output |
| **Report & Workpaper Drafting** | Populates findings and analysis into firm report templates and workpaper structures, ready for human review before delivery |
| **Source Document Traceability** | Every agent output is traceable back to the source data row or document section that triggered it |

# **3\. Workflow / User Journey**

Steps 1 and 7–9 involve the advisory team directly. All other steps are executed autonomously by the Lyzr agent. Steps highlighted in green are mandatory human review gates — no output proceeds to the client without explicit advisory team approval.

| Step | Actor | Action | Output | Tool / System |
| ----- | :---- | :---- | :---- | :---- |
| **1** | Advisory Team | Uploads 36 months of trial-balance files | Raw monthly trial-balance data ingested by the agent | Agent UI / File Upload |
| **2** | AI Agent | Parses and structures data into clean monthly views | Normalised account-level monthly dataset ready for analysis | Lyzr Agent |
| **3** | AI Agent | Runs trend detection across all accounts | Flagged anomalies in revenue, payroll, AR, costs, and margins with period-over-period deltas | Lyzr Agent |
| **4** | AI Agent | Performs driver analysis on flagged movements | Likely cause identified per anomaly — cross-referenced against related accounts (e.g., payroll spike attributed to three-payroll month) | Lyzr Agent |
| **5** | AI Agent | Generates prioritised management follow-up questions | Context-aware question list ranked by materiality — formatted for management discussion or diligence call | Lyzr Agent |
| **6** | AI Agent | Logs all findings into dynamic issue tracker with severity rankings | Structured issue log with account reference, period, severity, and driver summary | Lyzr Agent |
| **7** | **Advisory Team** | **Reviews findings in human-in-the-loop inbox** | **Each finding approved, edited, or rejected before proceeding to output** | **Agent UI — Review Inbox** |
| **8** | AI Agent | Compiles approved findings into report / workpaper draft | Populated firm-template document with analysis, issues, and follow-up questions — ready for final human review | Lyzr Agent |
| **9** | **Advisory Team** | **Final review and sign-off before client-facing delivery** | **Reviewed, approved diligence package ready for client or internal use** | **Agent UI** |

# **4\. Integrations / Data Sources**

The PoC is designed to work with data sources CohnReznick already uses in engagements — no new external system integrations are required. All data is processed within a dedicated Azure instance.

| Source / System | Role | Data Used / Extractable |
| :---- | :---- | :---- |
| **Trial Balance Files (Excel / CSV)** | Primary data source — monthly account-level financial data uploaded directly by the advisory team | Account names, account codes, monthly balances, debit/credit entries, period dates — spanning 36 months |
| **Supporting Workpapers** | Supplementary context documents uploaded alongside the trial balance to help the agent validate drivers | Prior-period adjustments, reclassifications, notes to accounts, supporting schedules |
| **Firm Report Templates (PowerPoint / Word)** | Output formatting layer — agent populates findings into existing CohnReznick templates | Template structure, section headings, placeholder fields; agent writes findings content into the correct locations |
| **Azure OpenAI / Lyzr Agent Engine** | Core AI reasoning and orchestration layer — runs all analysis, anomaly detection, question generation, and drafting | No client data leaves the dedicated instance; all processing occurs within the isolated Azure deployment |

# **5\. Success Criteria**

The PoC is considered successful when the following criteria are met in a demo and review session with Rahul and Paul, forming the basis of the leadership presentation to Margaret, Claudine, and the COO.

| Criterion | Definition | Priority |
| :---- | :---- | :---- |
| Trial Balance Parsing | Agent correctly structures and normalises 36 months of trial-balance data across all uploaded files without manual cleanup | **High** |
| Anomaly Detection Accuracy | 90%+ of material account movements flagged correctly; false positives below 10% | **High** |
| Driver Analysis Quality | Advisory team rates driver explanations as accurate and useful for ≥80% of flagged findings | **High** |
| Follow-Up Question Quality | Generated questions rated relevant and non-redundant by Rahul / Paul for ≥85% of outputs | **High** |
| Human Review Workflow | All findings pass through reviewer inbox before inclusion in any output; no client-facing content bypasses human approval | **High** |
| Template Output Fidelity | Agent correctly populates CohnReznick report/workpaper templates without breaking formatting | **Medium** |
| Source Traceability | Every finding references the source account and period that triggered it | **High** |
| Performance | Full 36-month analysis and question set generated within an acceptable time window for advisory team use | **Medium** |
| User Satisfaction | Rahul and Paul rate the prototype as meaningfully beyond Copilot/GPT prompting in a demo review session | **High** |

**www.lyzr.ai**

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJIAAABTCAIAAAD7rcnIAAAFFUlEQVR4Xu2Zuy80bxTHx7rtel1ChMqlUCrYP0LhH/BPqJToiEalpNIiUShUSoVOIpEIPyI2yK47cWfn/b7PyU5mz86O2d/u7DqcTyHMc53zmec8zwzLVgRi8QuKBFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSFSbSIRpSxs+Pz95wS+jAtpaW1vr6uosy6qurrYKBE2qqqpisRh62NvbS6VSvPffQZm0YYmsrq5yCcUBf5FIpLa29vb2lo/30wld28fHB5zxkJea/f19PvCPJnRtj4+PlNl4pLP5soI/NTU1fOAcaF/kV2USrraXl5d4PM5jnA0inkgkqH5fX5+7qKOjI5lMUj9BvKJa1vDZ/DG8vb3xAoGEqw0xwvbDo+vF4eEhycPqpCtXV1e2ybH4CbXZ1T3AmvZZTOiHOuEFZeTp6en8/HxgYACTKfIwHO5tBNdmmbhvbW319PT09/c7Anil/Hx/bQ4+8wxIuLdRkDZQX1///v5umyivrKwU1LZQbc/PzxhucnLSsxUuYt0jqQ4NDSH3trS0oHIkDxgabyPU8ODgIBqNzszM4Pe5ubkqQ0NDAzYL/xxeEN9CGx3lFxcXKXXg9nBxeXkZv5+eniIojY2NvE0O/togCa8Klkvb5eUlxkWr+/t7z4Z4NaSgY1aYXm6ihh76BXY3NzepVXt7u5U5YcEWfjovqdndF0XltVFoELgPA55TaoJ7vrm5oX4mJia+7MdfG2DasKzX1tbQLUY/OztzVfwHTKAymuTbhNCcPhc0NzdDvHOdVKHbpaUlyhxhUHltd3d3qIno0OPvLsJz2t3d/fr6apvl4i7KpVBttpkesh81dx8Turq6KPVhSu76DtPT09QqFouxItL25WSKpGLacHvYV7B/4PbwtFJG4pUM6AHOUBMdPjw8oCE95gz/SOUmSSKd+RSAUpz08Of29jbNOd/HF+RGmiovMJA2EOqbhvfYpSKfNuxV7hD75MCIobe3l94H0obd3V1e7yttttdqI+i0glFw6MDDQVvR1NSUZ3q0zLkJ8IIMP1kbgWBBgG32Cap/fX1tmd2OFh/sspun0Hvirw2Z1jIPwezsrJ1zBMchCCNS5zSuuxRLHPXb2tos42xhYcHOPEDEp4Eq08kFWyO9cYZEuNrgw0ebA3aIjY0NPOmOP0SZzmlIXLh/RMEzMbrx14YidBUxBxBKcey8gFIaAnFnRZDqHBrzgQpUubOzk/5Eh+5OSku42rBWrGD/oMFTPDY2hkd+fn7enZ0SiQRlrSD4R4qkXlxcHB0dsSKMODo6Sks8N7nhGUKF4+Pj//JwcnLinjNeWtLmYOzqo8SEq41mz6PrBRJUMplEZefj1vj4OP4cHh4Osl7RfGRkhA8fDEwSbxq0CiGAF39LwtVG7Ozs8DCXFIQbWZSPGhhKj2BwcLCEHzJCpRzabBOaIIvmf4Bu19fXi3mxpQ04Ho+nUimf3fFbUSZtBLaNqIHCbWU+kRQE2cIppqmpyTbbEh/mF1BWbW7S5lstvxoMnMh/py2HimlTikG1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1iUS1ieQv8K7IgL2pr5IAAAAASUVORK5CYII=>