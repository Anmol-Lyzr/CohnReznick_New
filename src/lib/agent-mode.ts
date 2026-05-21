export function isLiveAgentConfigured(): boolean {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_AGENT_ID);
}

export function getAgentModeLabel(): "live" | "demo" {
  return isLiveAgentConfigured() ? "live" : "demo";
}

export function getWebhookAgentConfig(): {
  webhookUrl: string;
  secretKey: string;
  apiKey: string;
} | null {
  const webhookUrl = process.env.LYZR_WEBHOOK_URL;
  const secretKey = process.env.LYZR_WEBHOOK_SECRET;
  const apiKey = process.env.LYZR_API_KEY;
  if (!webhookUrl || !secretKey || !apiKey) return null;
  return { webhookUrl, secretKey, apiKey };
}

export function isWebhookAgentConfigured(): boolean {
  return getWebhookAgentConfig() !== null;
}
