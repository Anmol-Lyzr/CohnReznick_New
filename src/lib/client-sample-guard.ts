import { ENGAGEMENT_NAMES } from "@/lib/customer-management";
import { isCustomEngagement } from "@/lib/agent-mode";

export function isBuiltInEngagement(clientName: string): boolean {
  return ENGAGEMENT_NAMES.includes(clientName.trim());
}

export function canLoadPoCSample(clientName: string): boolean {
  return isBuiltInEngagement(clientName);
}

export function shouldBlockSampleForClient(clientName: string): boolean {
  return isCustomEngagement(clientName);
}

/** Returns engagement name when PoC sample is allowed, otherwise null */
export function resolvePoCSampleEngagement(
  clientFromUrl: string | null | undefined,
  fallbackName: string
): string | null {
  const candidate = (clientFromUrl?.trim() || fallbackName).trim();
  return canLoadPoCSample(candidate) ? candidate : null;
}
