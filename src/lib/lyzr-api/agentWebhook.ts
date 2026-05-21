import https from "node:https";
import { URL } from "node:url";
import { execFile } from "node:child_process";
import type { AdvisoryAnalysisOutput } from "@/lib/advisory-output-types";
import { extractAdvisoryOutput } from "@/lib/parse-advisory-output";

/**
 * In Next.js dev mode with Node 25, outbound HTTPS requests issued inside a
 * POST handler that has already streamed an SSE body have been observed to
 * stall (the response is never delivered despite curl working fine from the
 * same machine). As a robust fallback we use the system `curl` binary which
 * lives outside the Node runtime and is not affected by the stall.
 */
function curlRequest(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeoutMs: number
): Promise<RawHttpResponse> {
  const args = [
    "-sS",
    "-o",
    "-", // body → stdout
    "-w",
    "\n__CURL_HTTP_STATUS__%{http_code}",
    "-X",
    method,
    "--max-time",
    String(Math.ceil(timeoutMs / 1000)),
  ];
  for (const [k, v] of Object.entries(headers)) {
    args.push("-H", `${k}: ${v}`);
  }
  if (body !== undefined) {
    args.push("--data-binary", body);
  }
  args.push(url);

  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      args,
      { maxBuffer: 16 * 1024 * 1024, timeout: timeoutMs + 5000 },
      (err, stdout) => {
        if (err && (err as NodeJS.ErrnoException).code !== undefined && !stdout) {
          reject(new Error(`curl exec failed: ${(err as Error).message}`));
          return;
        }
        const text = stdout.toString();
        const marker = "\n__CURL_HTTP_STATUS__";
        const idx = text.lastIndexOf(marker);
        if (idx === -1) {
          reject(new Error(`curl output missing status marker: ${text.slice(-200)}`));
          return;
        }
        const responseBody = text.slice(0, idx);
        const statusStr = text.slice(idx + marker.length).trim();
        const status = parseInt(statusStr, 10) || 0;
        if (status === 0) {
          reject(new Error(`curl reported HTTP 0 (network/timeout)`));
          return;
        }
        resolve({ status, body: responseBody });
      }
    );
  });
}

const SESSION_API_BASE = "https://agent-prod.studio.lyzr.ai/v1";

export class WebhookHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "WebhookHttpError";
  }
}

export class WebhookTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookTimeoutError";
  }
}

interface RawHttpResponse {
  status: number;
  body: string;
}

/**
 * Direct HTTPS request that bypasses Next.js's patched `fetch()` (which adds
 * caching/instrumentation that has been observed to hang on long-running
 * Lyzr endpoints in dev mode).
 */
/** Fresh HTTPS agent per request — avoids any keep-alive pool stalls that
 *  manifest when calling Lyzr from inside long-lived SSE responses. */
function rawHttpsRequestNode(
  method: "GET" | "POST",
  rawUrl: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeoutMs: number
): Promise<RawHttpResponse> {
  const u = new URL(rawUrl);
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ keepAlive: false });
    const req = https.request(
      {
        method,
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        agent,
        headers: {
          ...headers,
          Connection: "close",
          ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          agent.destroy();
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("error", (err) => {
          agent.destroy();
          reject(err);
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      agent.destroy();
    });
    req.on("error", (err) => {
      agent.destroy();
      reject(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Issues an HTTPS request preferring the system `curl` binary (which has
 * proven to reliably reach Lyzr from inside Next.js streaming routes). Falls
 * back to Node's `https` module if curl is unavailable.
 */
async function rawHttpsRequest(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  timeoutMs: number
): Promise<RawHttpResponse> {
  try {
    return await curlRequest(method, url, headers, body, timeoutMs);
  } catch (curlErr) {
    try {
      return await rawHttpsRequestNode(method, url, headers, body, timeoutMs);
    } catch (nodeErr) {
      throw new Error(
        `curl: ${(curlErr as Error).message} | node-https: ${(nodeErr as Error).message}`
      );
    }
  }
}

export interface TriggerWebhookArgs {
  webhookUrl: string;
  secretKey: string;
  payload: Record<string, unknown>;
}

export interface WebhookTriggerResponse {
  webhook_id?: string;
  agent_id?: string;
  session_id: string;
  [k: string]: unknown;
}

export async function triggerWebhookAgent({
  webhookUrl,
  secretKey,
  payload,
}: TriggerWebhookArgs): Promise<WebhookTriggerResponse> {
  let response: RawHttpResponse;
  try {
    response = await rawHttpsRequest(
      "POST",
      webhookUrl,
      {
        accept: "application/json",
        "Content-Type": "application/json",
        "x-secret-key": secretKey,
      },
      JSON.stringify(payload),
      90_000
    );
  } catch (error) {
    throw new WebhookHttpError(
      0,
      `Webhook trigger network error: ${(error as Error).message}`
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new WebhookHttpError(
      response.status,
      `Webhook trigger failed (HTTP ${response.status}): ${response.body.slice(0, 200)}`
    );
  }

  let data: Partial<WebhookTriggerResponse>;
  try {
    data = JSON.parse(response.body);
  } catch {
    throw new WebhookHttpError(
      response.status,
      `Webhook trigger returned non-JSON body: ${response.body.slice(0, 200)}`
    );
  }

  if (!data?.session_id) {
    throw new WebhookHttpError(
      response.status,
      `Webhook response missing session_id: ${response.body.slice(0, 200)}`
    );
  }
  return data as WebhookTriggerResponse;
}

interface SessionMessage {
  role?: string;
  content?: unknown;
  message?: unknown;
  text?: unknown;
  [k: string]: unknown;
}

interface SessionConversationResponse {
  conversation?: SessionMessage[];
  messages?: SessionMessage[];
  [k: string]: unknown;
}

function asAdvisoryFromMessage(msg: SessionMessage): AdvisoryAnalysisOutput | null {
  const candidates: unknown[] = [
    msg,
    msg.content,
    msg.message,
    msg.text,
    (msg as Record<string, unknown>).output,
    (msg as Record<string, unknown>).response,
  ];
  for (const candidate of candidates) {
    const parsed = extractAdvisoryOutput(candidate);
    if (parsed) return parsed;
  }
  return null;
}

export interface PollSessionArgs {
  sessionId: string;
  apiKey: string;
  timeoutMs?: number;
  intervalMs?: number;
  onTick?: (elapsedMs: number) => void;
}

export async function pollSessionConversation({
  sessionId,
  apiKey,
  timeoutMs = 240_000,
  intervalMs = 4000,
  onTick,
}: PollSessionArgs): Promise<AdvisoryAnalysisOutput> {
  const url = `${SESSION_API_BASE}/sessions/${encodeURIComponent(sessionId)}/conversation`;
  const started = Date.now();
  let lastHttpError: WebhookHttpError | null = null;

  while (Date.now() - started < timeoutMs) {
    onTick?.(Date.now() - started);
    try {
      const response = await rawHttpsRequest(
        "GET",
        url,
        {
          accept: "application/json",
          "x-api-key": apiKey,
        },
        undefined,
        20_000
      );

      if (response.status < 200 || response.status >= 300) {
        lastHttpError = new WebhookHttpError(
          response.status,
          `Session poll HTTP ${response.status}: ${response.body.slice(0, 200)}`
        );
      } else {
        let body: SessionConversationResponse | undefined;
        try {
          body = JSON.parse(response.body);
        } catch {
          lastHttpError = new WebhookHttpError(
            response.status,
            `Session poll returned non-JSON body: ${response.body.slice(0, 200)}`
          );
          body = undefined;
        }
        if (body) {
          const messages = body.conversation ?? body.messages ?? [];
          for (let i = messages.length - 1; i >= 0; i--) {
            const parsed = asAdvisoryFromMessage(messages[i]);
            if (parsed) return parsed;
          }
          const wholeBody = extractAdvisoryOutput(body);
          if (wholeBody) return wholeBody;
        }
      }
    } catch (error) {
      lastHttpError = new WebhookHttpError(
        0,
        `Session poll request failed: ${(error as Error).message}`
      );
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new WebhookTimeoutError(
    `Agent response not received within ${Math.round(timeoutMs / 1000)}s${
      lastHttpError ? ` (last error: ${lastHttpError.message})` : ""
    }`
  );
}
