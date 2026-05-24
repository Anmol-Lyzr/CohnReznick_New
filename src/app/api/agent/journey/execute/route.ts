import { NextRequest } from "next/server";
import { agentChat, buildAgentSessionId } from "@/lib/lyzr-api/agentChat";
import { uploadLyzrAsset } from "@/lib/lyzr-api/uploadAsset";
import { buildTrialBalancePreview } from "@/lib/lyzr-api/tb-file-for-agent";
import {
  getLyzrUserId,
  getNewClientAgentId,
  isCustomEngagement,
  isNewClientAgentConfigured,
} from "@/lib/agent-mode";
import { SKILL_ACTIVITIES } from "@/lib/mock-outputs";
import { parseAgentResult } from "@/lib/parse-advisory-output";
import { getAnalysisForEngagement } from "@/lib/engagement-analysis";
import { finalizeAgentAnalysis, syncReportFromIssues } from "@/lib/analysis-mutations";
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

async function* streamPocDemo(engagement: string): AsyncGenerator<string> {
  yield sse("activity", {
    action: `PoC sample data for "${engagement}" (built-in engagement)`,
    icon: "file",
    ts: Date.now(),
  });
  yield sse("structured", {
    analysis: syncReportFromIssues(getAnalysisForEngagement(engagement)),
  });
}

interface UploadedTbFile {
  name: string;
  type: string;
  buffer: Buffer;
}

async function* streamNewClientAgent(
  skill: string,
  inputs: Record<string, unknown>,
  uploaded?: UploadedTbFile
): AsyncGenerator<string> {
  const apiKey = process.env.LYZR_API_KEY!;
  const agentId = getNewClientAgentId()!;
  const engagement = (inputs.engagementName as string) || "";
  const fileName = (inputs.fileName as string) || uploaded?.name;

  if (skill === "trial-balance-ingestion" && !uploaded) {
    yield sse("activity", {
      action: "Trial balance file required for new client ingestion.",
      icon: "alert",
      ts: Date.now(),
    });
    yield sse("error", {
      error: "Upload a trial balance file (CSV or XLSX) before running ingestion for a new client.",
    });
    return;
  }

  let assetIds: string[] = [];
  let tbPreview: string | undefined;

  if (uploaded) {
    tbPreview = buildTrialBalancePreview(uploaded.buffer, uploaded.name);
    yield sse("activity", {
      action: `Uploading ${uploaded.name} to Lyzr assets…`,
      icon: "folder",
      ts: Date.now(),
    });
    try {
      const assetId = await uploadLyzrAsset(
        uploaded.buffer,
        uploaded.name,
        apiKey,
        uploaded.type
      );
      assetIds = [assetId];
      yield sse("activity", {
        action: `File uploaded (asset ${assetId.slice(0, 12)}…)`,
        icon: "check",
        ts: Date.now(),
      });
    } catch (uploadErr) {
      const detail = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
      console.warn("[journey/execute] Lyzr asset upload failed, using TB preview in message:", detail);
      yield sse("activity", {
        action: `Asset upload unavailable — sending parsed preview in message (${detail.slice(0, 80)})`,
        icon: "alert",
        ts: Date.now(),
      });
    }
  }

  const message = buildAdvisoryAgentMessage(skill, engagement, inputs, {
    omitPocContext: true,
    tbPreview,
  });

  const sessionId = buildAgentSessionId(agentId, engagement);

  yield sse("activity", {
    action: `Calling Lyzr inference API for "${engagement}"…`,
    icon: "cpu",
    ts: Date.now(),
  });

  try {
    const result = await agentChat(message, apiKey, agentId, {
      sessionId,
      assets: assetIds.length ? assetIds : undefined,
      userId: getLyzrUserId(),
    });

    const { text, analysis: agentAnalysis } = parseAgentResult(result, {
      clientName: engagement,
      fileName,
      skill,
    });

    if (agentAnalysis) {
      const named = forceClientName(agentAnalysis, engagement);
      const synced = finalizeAgentAnalysis(named);
      try {
        await persistEngagementAnalysis(synced);
      } catch (persistErr) {
        console.error("[journey/execute] Mongo analysis persist failed:", persistErr);
      }
      yield sse("activity", {
        action: "Agent response received — parsed cohnreznick_advisory_ai_analyst output",
        icon: "file",
        ts: Date.now(),
      });
      yield sse("structured", { analysis: synced });
      return;
    }

    yield sse("activity", {
      action: "Agent returned text but no valid structured JSON.",
      icon: "alert",
      ts: Date.now(),
    });
    yield sse("error", {
      error:
        "Agent did not return valid cohnreznick_advisory_ai_analyst JSON. Check the agent schema in Lyzr Studio.",
    });
    if (text) yield* streamChunks(text);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error("[journey/execute] Lyzr inference error:", err);
    yield sse("activity", {
      action: `Inference API failed: ${detail}`,
      icon: "alert",
      ts: Date.now(),
    });
    yield sse("error", {
      error: `Lyzr inference API failed: ${detail}. Check LYZR_API_KEY and LYZR_NEW_CLIENT_AGENT_ID in .env.local.`,
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
  const activities = SKILL_ACTIVITIES[skill] || SKILL_ACTIVITIES["trial-balance-ingestion"];

  const engagement = ((inputs.engagementName as string) || "").trim();
  const isCustomClient = isCustomEngagement(engagement);
  const newClientAgentReady = isNewClientAgentConfigured();

  let uploadedTb: UploadedTbFile | undefined;
  const uploadedFile = formData.get("document");
  if (engagement && uploadedFile instanceof File && uploadedFile.size > 0) {
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());
    uploadedTb = {
      name: uploadedFile.name,
      type: uploadedFile.type,
      buffer,
    };
    try {
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
        const headerLabel = isCustomClient
          ? newClientAgentReady
            ? "Live Lyzr agent (new client)"
            : "New client agent not configured"
          : "PoC sample (built-in engagement)";

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
        let doneMode: "live" | "demo" = "demo";

        if (!isCustomClient) {
          const fallback =
            engagement || ENGAGEMENT_NAMES[0] || "Horizon Logistics LLC";
          outputStream = streamPocDemo(fallback);
          doneMode = "demo";
        } else if (!newClientAgentReady) {
          outputStream = (async function* () {
            yield sse("activity", {
              action:
                "Lyzr new-client agent is not configured (set LYZR_API_KEY and LYZR_NEW_CLIENT_AGENT_ID).",
              icon: "alert",
              ts: Date.now(),
            });
            yield sse("error", {
              error:
                "New client inference agent not configured. Set LYZR_API_KEY and LYZR_NEW_CLIENT_AGENT_ID in .env.local.",
            });
          })();
        } else {
          outputStream = streamNewClientAgent(skill, inputs, uploadedTb);
          doneMode = "live";
        }

        for await (const chunk of outputStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.enqueue(encoder.encode(sse("done", { mode: doneMode })));
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
