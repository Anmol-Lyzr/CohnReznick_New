import { NextRequest } from "next/server";
import { agentChat } from "@/lib/lyzr-api/agentChat";
import { isLiveAgentConfigured, getAgentModeLabel } from "@/lib/agent-mode";
import { SKILL_ACTIVITIES } from "@/lib/mock-outputs";
import { parseAgentResult } from "@/lib/parse-advisory-output";
import { getAnalysisForEngagement } from "@/lib/engagement-analysis";
import { syncReportFromIssues } from "@/lib/analysis-mutations";
import { buildAdvisoryAgentMessage } from "@/lib/agent-prompts";
import { ENGAGEMENT_NAMES } from "@/lib/customer-management";
import {
  persistEngagementAnalysis,
  persistUploadedFile,
} from "@/lib/mongodb/persist";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function* streamChunks(text: string): AsyncGenerator<string> {
  const chunks = text.match(/[\s\S]{1,120}/g) || [];
  for (const chunk of chunks) {
    yield sse("delta", { text: chunk });
    await new Promise((r) => setTimeout(r, 12));
  }
}

function forceClientName(
  analysis: AdvisoryAnalysisOutput,
  clientName: string
): AdvisoryAnalysisOutput {
  if (analysis.engagement?.client_name === clientName) return analysis;
  return {
    ...analysis,
    engagement: { ...analysis.engagement, client_name: clientName },
  };
}

async function* streamLiveAgent(
  skill: string,
  inputs: Record<string, unknown>,
  options: { isCustomClient: boolean }
): AsyncGenerator<string> {
  const apiKey = process.env.LYZR_API_KEY!;
  const agentId = process.env.LYZR_AGENT_ID!;
  const engagement = (inputs.engagementName as string) || "TargetCo Acquisition";
  const message = buildAdvisoryAgentMessage(skill, engagement, inputs, {
    omitPocContext: options.isCustomClient,
  });

  yield sse("activity", {
    action: `Calling Lyzr inference API for "${engagement}"…`,
    icon: "cpu",
    ts: Date.now(),
  });

  try {
    const result = await agentChat(message, apiKey, agentId);
    const { text, analysis: agentAnalysis } = parseAgentResult(result);

    if (agentAnalysis) {
      const named = options.isCustomClient
        ? forceClientName(agentAnalysis, engagement)
        : agentAnalysis;
      const synced = syncReportFromIssues(named);
      try {
        await persistEngagementAnalysis(synced);
      } catch (persistErr) {
        console.error("[journey/execute] Mongo analysis persist failed:", persistErr);
      }
      yield sse("activity", {
        action: "Agent response received — parsing advisory_analysis_output…",
        icon: "file",
        ts: Date.now(),
      });
      yield sse("structured", { analysis: synced });
      return;
    }

    if (options.isCustomClient) {
      yield sse("activity", {
        action: "Agent returned text but no advisory_analysis_output JSON.",
        icon: "alert",
        ts: Date.now(),
      });
      yield sse("error", {
        error:
          "Agent did not return valid advisory_analysis_output JSON. Check the agent prompt/schema in Lyzr Studio.",
      });
      if (text) yield* streamChunks(text);
      return;
    }

    const engagementData = syncReportFromIssues(getAnalysisForEngagement(engagement));
    if (!text) {
      yield sse("structured", { analysis: engagementData });
      return;
    }
    yield* streamChunks(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error("[journey/execute] Lyzr inference error:", err);

    if (options.isCustomClient) {
      yield sse("activity", {
        action: `Inference API failed: ${detail}`,
        icon: "alert",
        ts: Date.now(),
      });
      yield sse("error", {
        error: `Lyzr inference API failed: ${detail}. Check LYZR_API_KEY and LYZR_AGENT_ID in .env.local.`,
      });
      return;
    }

    yield sse("activity", {
      action: `Live agent error — using PoC sample data (${detail})`,
      icon: "alert",
      ts: Date.now(),
    });
    yield sse("structured", {
      analysis: syncReportFromIssues(getAnalysisForEngagement(engagement)),
    });
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const skill = (formData.get("skill") as string) || "trial-balance-ingestion";
  const inputs = JSON.parse((formData.get("inputs") as string) || "{}") as Record<
    string,
    unknown
  >;
  const mode = getAgentModeLabel();
  const activities = SKILL_ACTIVITIES[skill] || SKILL_ACTIVITIES["trial-balance-ingestion"];

  const engagement = ((inputs.engagementName as string) || "").trim();
  const isCustomClient =
    engagement.length > 0 && !ENGAGEMENT_NAMES.includes(engagement);
  const liveConfigured = isLiveAgentConfigured();

  const uploadedFile = formData.get("document");
  if (engagement && uploadedFile instanceof File && uploadedFile.size > 0) {
    try {
      const buffer = Buffer.from(await uploadedFile.arrayBuffer());
      await persistUploadedFile(engagement, {
        name: uploadedFile.name,
        type: uploadedFile.type,
        buffer,
      });
    } catch (persistErr) {
      console.error("[journey/execute] Mongo file persist failed:", persistErr);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const headerLabel = liveConfigured
          ? "Live Lyzr inference API"
          : "Demo (configure LYZR_API_KEY + LYZR_AGENT_ID for live)";

        controller.enqueue(
          encoder.encode(
            sse("activity", {
              action: `Agent mode: ${headerLabel}`,
              icon: "cpu",
              ts: Date.now(),
            })
          )
        );

        for (const act of activities) {
          controller.enqueue(encoder.encode(sse("activity", { ...act, ts: Date.now() })));
          await new Promise((r) => setTimeout(r, 350));
        }

        controller.enqueue(
          encoder.encode(sse("generating", { action: "Generating deliverable..." }))
        );

        let outputStream: AsyncGenerator<string>;
        if (isCustomClient && !liveConfigured) {
          outputStream = (async function* () {
            yield sse("activity", {
              action:
                "Lyzr inference API is not configured (set LYZR_API_KEY and LYZR_AGENT_ID).",
              icon: "alert",
              ts: Date.now(),
            });
            yield sse("error", {
              error:
                "Inference agent not configured. Set LYZR_API_KEY and LYZR_AGENT_ID in .env.local.",
            });
          })();
        } else if (liveConfigured) {
          outputStream = streamLiveAgent(skill, inputs, { isCustomClient });
        } else {
          outputStream = (async function* () {
            const fallback = (inputs.engagementName as string) || "TargetCo Acquisition";
            yield sse("structured", {
              analysis: syncReportFromIssues(getAnalysisForEngagement(fallback)),
            });
          })();
        }

        for await (const chunk of outputStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.enqueue(
          encoder.encode(sse("done", { mode: liveConfigured ? "live" : mode }))
        );
      } catch {
        controller.enqueue(encoder.encode(sse("error", { error: "Stream failed" })));
      } finally {
        controller.close();
      }
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
