import { NextResponse } from "next/server";
import { isLiveAgentConfigured } from "@/lib/agent-mode";

export async function GET() {
  return NextResponse.json({
    provider: "azure-lyzr",
    composioConfigured: false,
    agentMode: isLiveAgentConfigured() ? "live" : "demo",
    integrations: [
      {
        id: "trial-balance",
        name: "Trial Balance Files",
        category: "data",
        status: "connected",
        description: "Excel/CSV upload — primary 36-month data source",
        useInSkills: ["trial-balance-ingestion", "anomaly-detection"],
      },
      {
        id: "workpapers",
        name: "Supporting Workpapers",
        category: "data",
        status: "connected",
        description: "Prior-period adjustments, reclassifications, notes to accounts",
        useInSkills: ["driver-analysis", "follow-up-questions"],
      },
      {
        id: "templates",
        name: "Report Templates",
        category: "output",
        status: "connected",
        description: "CohnReznick Word/PPT diligence templates",
        useInSkills: ["report-drafting"],
      },
      {
        id: "lyzr-azure",
        name: "Azure OpenAI / Lyzr Agent",
        category: "ai",
        status: isLiveAgentConfigured() ? "connected" : "requires_setup",
        description: "Isolated dedicated instance — no cross-customer data mixing",
        useInSkills: [
          "trial-balance-ingestion",
          "anomaly-detection",
          "driver-analysis",
          "follow-up-questions",
          "issue-tracker",
          "report-drafting",
        ],
      },
    ],
  });
}
