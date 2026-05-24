import { NextRequest } from "next/server";
import { agentChat } from "@/lib/lyzr-api/agentChat";
import { isLiveAgentConfigured } from "@/lib/agent-mode";
import { parseAgentResult } from "@/lib/parse-advisory-output";
import { buildChatAgentMessage } from "@/lib/agent-prompts";
import { DEMO_ENGAGEMENT } from "@/lib/cohnreznick-metadata";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk(text: string): string[] {
  return text.match(/[\s\S]{1,80}/g) || [];
}

function generateMockResponse(query: string): string {
  const lower = query.toLowerCase();
  const client = DEMO_ENGAGEMENT.client;

  if (lower.includes("status") || lower.includes("horizon") || lower.includes("engagement")) {
    return `## ${client} — Diligence Status

| Workflow Step | Status |
|---------------|--------|
| TB Ingestion | Complete |
| Anomaly Detection | Complete |
| Driver Analysis | In progress |
| Follow-Up Questions | Not started |
| Issue Tracker | Pending |
| **Human Review** | **3 pending** |
| Report Draft | Not started |

**Next action:** Open **Anomaly Detection** to approve freight and fuel findings.`;
  }

  if (lower.includes("anomal") || lower.includes("freight") || lower.includes("fuel") || lower.includes("trend")) {
    return `## Material Anomalies — ${client}

1. **Freight Revenue (4100)** — −11.2% QoQ Q4 2025 (High)
2. **Fuel & DEF (5100)** — +18% YoY, surcharge lag (High)
3. **Fleet Assets (1500)** — Capex spike Sep 2025 (Medium)

Run **Driver Analysis** for cross-account explanations, or open **Anomaly Detection** to approve findings.`;
  }

  if (lower.includes("review") || lower.includes("approve")) {
    return `## Human-in-the-Loop Review

3 findings are pending approval. Approve, edit, or reject each anomaly in **Anomaly Detection** before report drafting.

This is a mandatory gate per the CohnReznick PoC workflow (Steps 7 & 9).`;
  }

  if (lower.includes("upload") || lower.includes("trial balance") || lower.includes("tb")) {
    return `## Trial Balance Upload

Upload trial-balance data (Excel/CSV) via **TB Ingestion** (/tools/skills/trial-balance-ingestion).

PoC sample file: \`TB_Horizon_FY25.csv\` — use the **PoC Sample** toggle to load demo data.`;
  }

  return `## CohnReznick Advisory Agent

I can help with transaction diligence workflows:

- **Upload & parse** trial balance data
- **Detect anomalies** in revenue, costs, working capital, and margins
- **Explain drivers** with cross-account analysis
- **Generate follow-up questions** for management
- **Track issues** with severity and source traceability
- **Review findings** before client delivery

Try: "What is the ${client} engagement status?" or "Show freight revenue anomalies"`;
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const lastMessage = messages?.[messages.length - 1]?.content || "";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("phase", { phase: 1, name: "Context Loading", description: "Loading CohnReznick advisory agent context" });
      await delay(200);
      send("skill_loading", { skill: "trial-balance-ingestion", action: "TB Ingestion skill available", isPrimary: true });
      await delay(150);
      send("skill_loading", { skill: "anomaly-detection", action: "Anomaly Detection skill available", isPrimary: false });
      await delay(150);
      send("phase", { phase: 2, name: "Processing Request", description: "Analyzing your query" });
      await delay(300);
      send("llm_start", { action: isLiveAgentConfigured() ? "Querying live Lyzr agent..." : "Generating response (demo mode)..." });
      await delay(400);

      let fullText = generateMockResponse(lastMessage);
      let analysis = null as ReturnType<typeof parseAgentResult>["analysis"];
      let streamMode: "live" | "demo" = isLiveAgentConfigured() ? "live" : "demo";

      if (isLiveAgentConfigured()) {
        try {
          const result = await agentChat(
            buildChatAgentMessage(lastMessage),
            process.env.LYZR_API_KEY!,
            process.env.LYZR_AGENT_ID!
          );
          const parsed = parseAgentResult(result);
          analysis = parsed.analysis;
          if (analysis) {
            send("structured", { analysis });
            fullText = `## Advisory Analysis — ${analysis.engagement.client_name}\n\n${analysis.report.executive_summary}\n\n**${analysis.summary_stats.total_issues} issues** (${analysis.summary_stats.high_severity} HIGH) · ${analysis.summary_stats.total_questions} follow-up questions.\n\nOpen **Anomaly Detection** to review flagged movements.`;
          } else {
            fullText = parsed.text;
          }
        } catch (err) {
          console.error("[chat] Lyzr agent error:", err);
          streamMode = "demo";
          send("phase", {
            phase: 2,
            name: "Fallback",
            description: "Live agent unavailable — using demo response",
          });
        }
      }

      for (const c of chunk(fullText)) {
        send("delta", { text: c });
        await delay(25);
      }

      send("done", { mode: streamMode, hasStructured: !!analysis });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
