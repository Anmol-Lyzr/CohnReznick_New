import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import {
  mapAgentV2ToAdvisoryAnalysis,
  normalizeAgentV2Payload,
} from "@/lib/map-agent-v2-output";

const REQUIRED_ROOT_KEYS = [
  "engagement",
  "parse_warnings",
  "suppressed_anomalies",
  "issue_log",
  "report",
  "summary_stats",
] as const;

export interface ExtractAdvisoryOptions {
  clientName?: string;
  fileName?: string;
  skill?: string;
}

export function isAdvisoryAnalysisOutput(value: unknown): value is AdvisoryAnalysisOutput {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return REQUIRED_ROOT_KEYS.every((key) => key in obj);
}

function tryMapV2(
  raw: unknown,
  options?: ExtractAdvisoryOptions
): AdvisoryAnalysisOutput | null {
  const v2 = normalizeAgentV2Payload(raw);
  if (!v2) return null;
  const clientName = options?.clientName?.trim() || v2.engagement.client_name || "New Client";
  return mapAgentV2ToAdvisoryAnalysis(v2, {
    clientName,
    fileName: options?.fileName,
    skill: options?.skill,
  });
}

/** Pull advisory JSON from Lyzr responses, markdown fences, or nested wrappers */
export function extractAdvisoryOutput(
  raw: unknown,
  options?: ExtractAdvisoryOptions
): AdvisoryAnalysisOutput | null {
  if (raw == null) return null;

  const v2Direct = tryMapV2(raw, options);
  if (v2Direct) return v2Direct;

  if (isAdvisoryAnalysisOutput(raw)) return raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    try {
      return extractAdvisoryOutput(JSON.parse(trimmed), options);
    } catch {
      /* continue */
    }

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      const fromFence = extractAdvisoryOutput(fenced[1].trim(), options);
      if (fromFence) return fromFence;
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return extractAdvisoryOutput(JSON.parse(candidate), options);
      } catch {
        /* continue */
      }
    }

    return null;
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    const wrappers = [
      "cohnreznick_advisory_ai_analyst",
      "advisory_analysis_output",
      "structured_output",
      "output",
      "data",
      "result",
      "content",
      "response",
      "message",
      "text",
    ] as const;

    for (const key of wrappers) {
      if (key in obj && obj[key] != null) {
        const nested = extractAdvisoryOutput(obj[key], options);
        if (nested) return nested;
      }
    }

    if (isAdvisoryAnalysisOutput(obj)) return obj;
  }

  return null;
}

/** Normalize agent text from Lyzr chat API payloads */
export function extractAgentText(result: unknown): string {
  if (result == null) return "";
  if (typeof result === "string") return result;

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    const fields = ["response", "message", "text", "content", "output"] as const;
    for (const key of fields) {
      const val = obj[key];
      if (typeof val === "string" && val.trim()) return val;
    }
    if (isAdvisoryAnalysisOutput(result) || extractAdvisoryOutput(result)) {
      return JSON.stringify(result, null, 2);
    }
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  }

  return String(result);
}

export function parseAgentResult(
  result: unknown,
  options?: ExtractAdvisoryOptions
): {
  text: string;
  analysis: AdvisoryAnalysisOutput | null;
} {
  const analysis =
    extractAdvisoryOutput(result, options) ??
    extractAdvisoryOutput(extractAgentText(result), options);
  const text = analysis ? JSON.stringify(analysis, null, 2) : extractAgentText(result);
  return { text, analysis };
}
