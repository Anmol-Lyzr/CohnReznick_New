import crypto from "crypto";
import { postJson } from "@/lib/lyzr-api/lyzrHttp";

const INFERENCE_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/";

function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(5).toString("hex");
  return `${timestamp}-${randomStr}`;
}

export async function agentChat(
  message: string,
  lyzrApiKey: string,
  agentId: string,
  sessionId?: string
) {
  const userId = generateUniqueId();
  const chatSessionId = sessionId || generateUniqueId();

  const data = await postJson<Record<string, unknown> & {
    response?: string;
    success?: boolean;
    status?: string;
    data?: unknown;
  }>(
    INFERENCE_URL,
    { "x-api-key": lyzrApiKey },
    {
      user_id: userId,
      agent_id: agentId,
      session_id: chatSessionId,
      message,
    },
    180_000
  );

  return {
    ...data,
    user_id: userId,
    session_id: chatSessionId,
  };
}
