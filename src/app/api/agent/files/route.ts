import { readFileSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getMockOutput } from "@/lib/mock-outputs";

function loadPocDesignDoc(): string {
  const filePath = path.join(
    process.cwd(),
    "public/documents/CohnReznick_Advisory_Agent_PoC.md"
  );
  return readFileSync(filePath, "utf-8");
}

const FILE_STUBS: Record<string, string> = {
  "knowledge/docs/diligence-methodology.md": `# CohnReznick Diligence Methodology

## Transaction Advisory Approach
Our transaction advisory practice applies structured financial diligence across trial-balance data, supporting workpapers, and management representations.

## 36-Month TB Analysis Framework
1. Ingest and normalize monthly account-level data
2. Detect material period-over-period movements
3. Cross-reference drivers across related accounts
4. Generate management follow-up questions
5. Human review before client-facing output

## Human-in-the-Loop Requirements
No finding reaches client delivery without explicit advisory team approval.`,

  "SOUL.md": `# Agent Identity — CohnReznick Advisory Agent

You are an agentic junior analyst for CohnReznick transaction advisory engagements.
Execute multi-step diligence workflows autonomously while preserving human judgment at every client-facing step.`,

  "RULES.md": `# Agent Rules

- Never bypass human review for client-facing output
- Every finding must reference source account and period
- Process data only within the dedicated Azure instance
- Do not train models on client data`,

  "workspace/cohnreznick-poc/engagement-brief.md": `# TargetCo Acquisition — Engagement Brief

**Client:** TargetCo Acquisition (PoC)
**Engagement Type:** Transaction Diligence
**Period:** 36 months (Jan 2023 – Jan 2026)
**Lead:** Paul Johnson

## Objectives
1. Analyze 36-month trial-balance trends for material anomalies
2. Explain drivers with cross-account references
3. Generate management follow-up questions
4. Produce human-reviewed diligence report`,

  "workspace/cohnreznick-poc/trial-balance-summary.md": getMockOutput("trial-balance-ingestion", { engagementName: "TargetCo Acquisition" }),
  "workspace/cohnreznick-poc/anomaly-findings.md": getMockOutput("anomaly-detection", { engagementName: "TargetCo Acquisition" }),
  "workspace/cohnreznick-poc/driver-analysis.md": getMockOutput("driver-analysis", { engagementName: "TargetCo Acquisition" }),
  "workspace/cohnreznick-poc/follow-up-questions.md": getMockOutput("follow-up-questions", { engagementName: "TargetCo Acquisition" }),
  "workspace/cohnreznick-poc/issue-log.md": getMockOutput("issue-tracker", { engagementName: "TargetCo Acquisition" }),
  "workspace/cohnreznick-poc/diligence-report-draft.md": getMockOutput("report-drafting", { engagementName: "TargetCo Acquisition" }),
};

const POC_DOC_PATHS = new Set([
  "documents/CohnReznick_Advisory_Agent_PoC.md",
  "documents/CohnReznick_Advisory_Agent_PoC.pdf",
]);

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "";
  let content = FILE_STUBS[path];
  if (!content && POC_DOC_PATHS.has(path)) {
    try {
      content = loadPocDesignDoc();
    } catch {
      content = `# CohnReznick Advisory Agent PoC\n\nDocument file not found on server.`;
    }
  }
  if (!content) {
    content = `# ${path.split("/").pop() || "File"}\n\nPreview not available. Connect knowledge base for full content.`;
  }
  return NextResponse.json({ content });
}
