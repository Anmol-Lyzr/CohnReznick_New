import https from "node:https";
import { URL } from "node:url";
import { execFile } from "node:child_process";

interface RawHttpResponse {
  status: number;
  body: string;
}

function curlPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<RawHttpResponse> {
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
  ];
  for (const [k, v] of Object.entries(headers)) {
    args.push("-H", `${k}: ${v}`);
  }
  args.push("--data-binary", body, url);

  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      args,
      { maxBuffer: 16 * 1024 * 1024, timeout: timeoutMs + 5000 },
      (err, stdout) => {
        if (err && !stdout) {
          reject(new Error(`curl failed: ${(err as Error).message}`));
          return;
        }
        const text = stdout.toString();
        const marker = "\n__CURL_HTTP_STATUS__";
        const idx = text.lastIndexOf(marker);
        if (idx === -1) {
          reject(new Error(`curl output missing status: ${text.slice(-200)}`));
          return;
        }
        const responseBody = text.slice(0, idx);
        const status = parseInt(text.slice(idx + marker.length).trim(), 10) || 0;
        if (status === 0) {
          reject(new Error("curl reported HTTP 0 (network/timeout)"));
          return;
        }
        resolve({ status, body: responseBody });
      }
    );
  });
}

function nodeHttpsPost(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<RawHttpResponse> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ keepAlive: false });
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        agent,
        headers: {
          ...headers,
          Connection: "close",
          "Content-Length": Buffer.byteLength(body).toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          agent.destroy();
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      agent.destroy();
    });
    req.on("error", (e) => {
      agent.destroy();
      reject(e);
    });
    req.write(body);
    req.end();
  });
}

function curlPostMultipart(
  url: string,
  headers: Record<string, string>,
  formFields: { name: string; buffer: Buffer; filename: string; contentType: string }[],
  timeoutMs: number
): Promise<RawHttpResponse> {
  const boundary = `----lyzr${Date.now().toString(16)}`;
  const parts: Buffer[] = [];

  for (const field of formFields) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field.name}"; filename="${field.filename}"\r\nContent-Type: ${field.contentType}\r\n\r\n`
      )
    );
    parts.push(field.buffer);
    parts.push(Buffer.from("\r\n"));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

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
    `Content-Type: multipart/form-data; boundary=${boundary}`,
  ];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "content-type") continue;
    args.push("-H", `${k}: ${v}`);
  }
  args.push("--data-binary", body.toString("binary"), url);

  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      args,
      { maxBuffer: 16 * 1024 * 1024, encoding: "buffer", timeout: timeoutMs + 5000 },
      (err, stdout) => {
        if (err && !stdout) {
          reject(new Error(`curl multipart failed: ${(err as Error).message}`));
          return;
        }
        const buf = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
        const text = buf.toString("utf8");
        const marker = "\n__CURL_HTTP_STATUS__";
        const idx = text.lastIndexOf(marker);
        if (idx === -1) {
          reject(new Error(`curl output missing status: ${text.slice(-200)}`));
          return;
        }
        const responseBody = text.slice(0, idx);
        const status = parseInt(text.slice(idx + marker.length).trim(), 10) || 0;
        if (status === 0) {
          reject(new Error("curl reported HTTP 0 (network/timeout)"));
          return;
        }
        resolve({ status, body: responseBody });
      }
    );
  });
}

/** POST multipart file to Lyzr assets API */
export async function postMultipart<T>(
  url: string,
  headers: Record<string, string>,
  file: { buffer: Buffer; filename: string; contentType: string; fieldName?: string },
  timeoutMs = 120_000
): Promise<T> {
  const reqHeaders = { accept: "application/json", ...headers };
  const response = await curlPostMultipart(
    url,
    reqHeaders,
    [
      {
        name: file.fieldName ?? "file",
        buffer: file.buffer,
        filename: file.filename,
        contentType: file.contentType,
      },
    ],
    timeoutMs
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Lyzr HTTP ${response.status}: ${response.body.slice(0, 300)}`);
  }

  try {
    return JSON.parse(response.body) as T;
  } catch {
    throw new Error(`Lyzr returned non-JSON: ${response.body.slice(0, 300)}`);
  }
}

/** POST JSON to Lyzr — prefers system curl (reliable inside Next.js SSE routes). */
export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs = 180_000
): Promise<T> {
  const body = JSON.stringify(payload);
  const reqHeaders = {
    accept: "application/json",
    "Content-Type": "application/json",
    ...headers,
  };

  let response: RawHttpResponse;
  try {
    response = await curlPost(url, reqHeaders, body, timeoutMs);
  } catch (curlErr) {
    response = await nodeHttpsPost(url, reqHeaders, body, timeoutMs).catch((nodeErr) => {
      throw new Error(
        `Lyzr HTTP failed — curl: ${(curlErr as Error).message}; node: ${(nodeErr as Error).message}`
      );
    });
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Lyzr HTTP ${response.status}: ${response.body.slice(0, 300)}`
    );
  }

  try {
    return JSON.parse(response.body) as T;
  } catch {
    throw new Error(`Lyzr returned non-JSON: ${response.body.slice(0, 300)}`);
  }
}
