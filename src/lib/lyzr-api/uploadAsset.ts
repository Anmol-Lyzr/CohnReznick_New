import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "crypto";

const ASSETS_UPLOAD_URL = "https://agent-prod.studio.lyzr.ai/v3/assets/upload";

function guessContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function extractAssetId(data: Record<string, unknown>): string | null {
  const candidates = [
    data.asset_id,
    data.assetId,
    data.id,
    (data.data as Record<string, unknown> | undefined)?.asset_id,
    (data.data as Record<string, unknown> | undefined)?.id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function curlUploadFile(
  url: string,
  apiKey: string,
  filePath: string,
  filename: string,
  contentType: string,
  timeoutMs: number
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      "-sS",
      "-o",
      "-",
      "-w",
      "\n__CURL_HTTP_STATUS__%{http_code}",
      "-X",
      "POST",
      "--max-time",
      String(Math.ceil(timeoutMs / 1000)),
      "-H",
      `x-api-key: ${apiKey}`,
      "-H",
      "accept: application/json",
      "-F",
      `file=@${filePath};filename=${filename};type=${contentType}`,
      url,
    ];

    execFile(
      "curl",
      args,
      { maxBuffer: 16 * 1024 * 1024, timeout: timeoutMs + 5000 },
      (err, stdout) => {
        if (err && !stdout) {
          reject(new Error(`curl asset upload failed: ${(err as Error).message}`));
          return;
        }
        const text = stdout.toString();
        const marker = "\n__CURL_HTTP_STATUS__";
        const idx = text.lastIndexOf(marker);
        if (idx === -1) {
          reject(new Error(`curl output missing status: ${text.slice(-200)}`));
          return;
        }
        resolve({
          status: parseInt(text.slice(idx + marker.length).trim(), 10) || 0,
          body: text.slice(0, idx),
        });
      }
    );
  });
}

/** Upload a file to Lyzr and return asset_id for multimodal chat */
export async function uploadLyzrAsset(
  buffer: Buffer,
  filename: string,
  apiKey: string,
  contentType?: string
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tmpPath = join(tmpdir(), `lyzr-${crypto.randomBytes(8).toString("hex")}-${safeName}`);
  const mime = contentType || guessContentType(filename);

  try {
    await fs.writeFile(tmpPath, buffer);
    const response = await curlUploadFile(
      ASSETS_UPLOAD_URL,
      apiKey,
      tmpPath,
      filename,
      mime,
      120_000
    );

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Lyzr asset upload HTTP ${response.status}: ${response.body.slice(0, 300)}`);
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      throw new Error(`Lyzr asset upload non-JSON: ${response.body.slice(0, 300)}`);
    }

    const assetId = extractAssetId(data);
    if (!assetId) {
      throw new Error(
        `Lyzr asset upload succeeded but no asset_id: ${JSON.stringify(data).slice(0, 200)}`
      );
    }
    return assetId;
  } finally {
    await fs.unlink(tmpPath).catch(() => undefined);
  }
}
