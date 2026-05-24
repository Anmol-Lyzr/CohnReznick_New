import { ENGAGEMENT_NAMES } from "@/lib/customer-management";

export function isLiveAgentConfigured(): boolean {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_AGENT_ID);
}

export function isNewClientAgentConfigured(): boolean {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_NEW_CLIENT_AGENT_ID);
}

export function getNewClientAgentId(): string | undefined {
  return process.env.LYZR_NEW_CLIENT_AGENT_ID;
}

export function getLyzrUserId(): string {
  return process.env.LYZR_USER_ID?.trim() || "anmol@lyzr.ai";
}

export function isCustomEngagement(engagementName: string): boolean {
  const trimmed = engagementName.trim();
  return trimmed.length > 0 && !ENGAGEMENT_NAMES.includes(trimmed);
}

export function getAgentIdForEngagement(engagementName: string): string | undefined {
  if (isCustomEngagement(engagementName)) {
    return process.env.LYZR_NEW_CLIENT_AGENT_ID;
  }
  return process.env.LYZR_AGENT_ID;
}

export function getAgentModeLabel(): "live" | "demo" {
  return isLiveAgentConfigured() || isNewClientAgentConfigured() ? "live" : "demo";
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
