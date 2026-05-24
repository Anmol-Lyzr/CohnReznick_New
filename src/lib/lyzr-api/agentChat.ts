import crypto from "crypto";
import { postJson } from "@/lib/lyzr-api/lyzrHttp";

const INFERENCE_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(5).toString("hex");
  return `${timestamp}-${randomStr}`;
}

export function buildAgentSessionId(agentId: string, clientName: string): string {
  const slug = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${agentId}-${slug || "session"}`;
}

export interface AgentChatOptions {
  sessionId?: string;
  assets?: string[];
  userId?: string;
}

export async function agentChat(
  message: string,
  lyzrApiKey: string,
  agentId: string,
  options?: AgentChatOptions
) {
  const userId = options?.userId?.trim() || generateUniqueId();
  const chatSessionId = options?.sessionId || generateUniqueId();

  const payload: Record<string, unknown> = {
    user_id: userId,
    agent_id: agentId,
    session_id: chatSessionId,
    message,
  };

  if (options?.assets?.length) {
    payload.assets = options.assets;
  }

  const data = await postJson<Record<string, unknown> & {
    response?: string;
    success?: boolean;
    status?: string;
    data?: unknown;
  }>(
    INFERENCE_URL,
    { "x-api-key": lyzrApiKey },
    payload,
    180_000
  );

  return {
    ...data,
    user_id: userId,
    session_id: chatSessionId,
  };
}
