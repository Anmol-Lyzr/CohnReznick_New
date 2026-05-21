/**
 * Verifies Lyzr agent response parses into advisory_analysis_output.
 * Usage: node scripts/verify-live-agent.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch {
    /* no .env.local */
  }
}

loadEnvLocal();

const apiKey = process.env.LYZR_API_KEY;
const agentId = process.env.LYZR_AGENT_ID;

if (!apiKey || !agentId) {
  console.error("Missing LYZR_API_KEY or LYZR_AGENT_ID in .env.local");
  process.exit(1);
}

const REQUIRED = [
  "engagement",
  "parse_warnings",
  "suppressed_anomalies",
  "issue_log",
  "report",
  "summary_stats",
];

function extract(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return extract(JSON.parse(raw.trim()));
    } catch {
      const s = raw.indexOf("{");
      const e = raw.lastIndexOf("}");
      if (s >= 0 && e > s) {
        try {
          return extract(JSON.parse(raw.slice(s, e + 1)));
        } catch {
          return null;
        }
      }
      return null;
    }
  }
  if (typeof raw === "object") {
    if (REQUIRED.every((k) => k in raw)) return raw;
    for (const k of ["response", "message", "output", "data"]) {
      if (raw[k]) {
        const n = extract(raw[k]);
        if (n) return n;
      }
    }
  }
  return null;
}

const message = [
  "Run the anomaly detection workflow for engagement \"TargetCo Acquisition\".",
  "Use the PoC trial balance context below (no file attached).",
  "",
  `Engagement: TargetCo Acquisition (TAS-2025-0042), buy-side transaction diligence.
Trial balance: 847 GL accounts, USD, periods Jan-23 through Jan-26 (36 months).
Material movements to analyze:
- Revenue 4100: −18.4% MoM Jan-26 ($3.8M → $3.1M)
- Payroll 6100: +42% Mar-25 (three-payroll month, 53-week calendar)
- AR 1200: DSO 68 days Dec-25 (+28% balance build)
- Gross margin: −3.2 pts FY-25 (COGS +12% vs revenue +6%)
- SG&A 6300: +156% Nov-25 one-time legal/M&A fees
Workpapers: WP-03 payroll calendar, WP-04 legal one-time, WP-07 customer concentration, WP-12 Customer B payment terms.`,
  "",
  "Return ONLY a single valid JSON object matching the advisory_analysis_output schema:",
  "engagement, parse_warnings, suppressed_anomalies, issue_log, report, summary_stats.",
  "Populate issue_log with all material findings (typically 4–6 issues), sorted by display_order.",
  "Set review_status to PENDING_REVIEW for each issue. No markdown, no code fences.",
].join("\n");

console.log("Calling Lyzr agent…");
const res = await fetch("https://agent-prod.studio.lyzr.ai/v3/inference/chat/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify({
    user_id: "anmol@lyzr.ai",
    agent_id: agentId,
    session_id: `${agentId}-verify-${Date.now()}`,
    message,
  }),
});

if (!res.ok) {
  console.error("API error", res.status, await res.text());
  process.exit(1);
}

const body = await res.json();
const analysis = extract(body);

if (!analysis) {
  console.error("FAIL: Could not parse advisory_analysis_output");
  console.error("Raw keys:", Object.keys(body));
  console.error("Response preview:", String(body.response || "").slice(0, 500));
  process.exit(1);
}

const issues = analysis.issue_log?.length ?? 0;
const stats = analysis.summary_stats;

console.log("PASS: Parsed advisory_analysis_output");
console.log("  engagement_ref:", analysis.engagement?.engagement_ref);
console.log("  client:", analysis.engagement?.client_name);
console.log("  issue_log:", issues);
console.log("  total_issues (stats):", stats?.total_issues);
console.log("  executive_summary:", (analysis.report?.executive_summary || "").slice(0, 120) + "…");

if (issues === 0) {
  console.warn("WARN: issue_log is empty — UI pages will show no findings");
  process.exit(2);
}

process.exit(0);
