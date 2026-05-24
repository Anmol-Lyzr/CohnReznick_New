/**
 * Verifies new-client Lyzr agent returns cohnreznick_advisory_ai_analyst JSON.
 * Usage: node scripts/verify-live-agent.mjs [path-to-tb-file]
 */
import { readFileSync, existsSync } from "fs";
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
const agentId = process.env.LYZR_NEW_CLIENT_AGENT_ID;

if (!apiKey || !agentId) {
  console.error("Missing LYZR_API_KEY or LYZR_NEW_CLIENT_AGENT_ID in .env.local");
  process.exit(1);
}

function isV2(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.agent_name === "string" &&
    obj.analysis_summary &&
    Array.isArray(obj.findings)
  );
}

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
    if (isV2(raw)) return raw;
    for (const k of [
      "cohnreznick_advisory_ai_analyst",
      "response",
      "message",
      "output",
      "data",
      "structured_output",
    ]) {
      if (raw[k]) {
        const n = extract(raw[k]);
        if (n) return n;
      }
    }
  }
  return null;
}

async function uploadAsset(filePath) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  const url = "https://agent-prod.studio.lyzr.ai/v3/assets/upload";
  const { stdout } = await exec("curl", [
    "-sS",
    "-X",
    "POST",
    "-H",
    `x-api-key: ${apiKey}`,
    "-H",
    "accept: application/json",
    "-F",
    `file=@${filePath}`,
    url,
  ]);
  const data = JSON.parse(stdout);
  return data.asset_id || data.assetId || data.id;
}

const tbArg = process.argv[2];
const defaultTb = resolve(root, "public/documents/trial-balance/TB_Horizon_FY25.csv");
const tbPath = tbArg ? resolve(process.cwd(), tbArg) : defaultTb;

let assets = [];
if (existsSync(tbPath)) {
  console.log("Uploading asset:", tbPath);
  try {
    const assetId = await uploadAsset(tbPath);
    if (assetId) {
      assets = [assetId];
      console.log("  asset_id:", assetId);
    }
  } catch (err) {
    console.warn("  asset upload skipped:", err.message);
  }
} else {
  console.warn("No TB file at", tbPath, "— calling without assets");
}

const message = [
  'Run the trial balance ingestion workflow for engagement "Verify Test Client".',
  "Uploaded trial balance file attached.",
  "",
  "Return ONLY valid JSON matching cohnreznick_advisory_ai_analyst schema:",
  "agent_name, agent_role, status, analysis_summary, findings, issue_tracker, report_summary, cta_actions, audit_trail.",
  "No markdown, no code fences.",
].join("\n");

console.log("Calling new-client Lyzr agent…", agentId);
const res = await fetch("https://agent-prod.studio.lyzr.ai/v3/inference/chat/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify({
    user_id: process.env.LYZR_USER_ID || "anmol@lyzr.ai",
    agent_id: agentId,
    session_id: `${agentId}-verify-${Date.now()}`,
    message,
    ...(assets.length ? { assets } : {}),
  }),
});

if (!res.ok) {
  console.error("API error", res.status, await res.text());
  process.exit(1);
}

const body = await res.json();
const v2 = extract(body);

if (!v2) {
  console.error("FAIL: Could not parse cohnreznick_advisory_ai_analyst JSON");
  console.error("Raw keys:", Object.keys(body));
  console.error("Response preview:", String(body.response || "").slice(0, 500));
  process.exit(1);
}

const findings = v2.findings?.length ?? 0;
const summary = v2.analysis_summary;

console.log("PASS: Parsed cohnreznick_advisory_ai_analyst");
console.log("  agent:", v2.agent_name, "· status:", v2.status);
console.log("  findings:", findings);
console.log("  months_analyzed:", summary?.months_analyzed);
console.log("  accounts_analyzed:", summary?.accounts_analyzed);
console.log(
  "  executive_summary:",
  (v2.report_summary?.executive_summary || "").slice(0, 120) + "…"
);

if (findings === 0) {
  console.warn("WARN: findings array is empty");
  process.exit(2);
}

process.exit(0);
