/**
 * POST /api/offer/read-url — reads a public offer page for the user to review.
 *
 * Body: {"url": "https://…"} (JSON, at most 4 KB). Response 200 with
 * {ok:true, text, finalUrl, signals} or {ok:false, reason, signals}; 400 for
 * a malformed request, 429 when rate limited.
 *
 * Security and privacy: the page is fetched server-side behind the SSRF guard
 * (src/lib/offer-input/url/ssrf.ts), with time and size limits, robots.txt
 * honoured and no cookies. The URL, the page and its text are never stored or
 * logged; only operational metadata is logged on a server error. Nothing is
 * analyzed here: the text goes back to the browser for review.
 */

import { randomUUID } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import { readOfferUrl } from "@/lib/offer-input/url/read-url";
import { readUrlRateLimiter } from "@/lib/offer-input/url/rate-limit";
import { logServerError } from "@/lib/offer-pipeline/api/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const MAX_URL_CHARS = 2_048;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** The body as text, or null when it is larger than `max` bytes; never buffers more than that. */
async function readCappedBody(request: Request, max: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function clientId(request: Request): string {
  const platformIp = ipAddress(request);
  if (platformIp) return platformIp;
  const header =
    request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  try {
    const rate = readUrlRateLimiter.check(clientId(request));
    if (!rate.allowed) {
      return json(429, { ok: false, reason: "rate_limited", requestId }, { "retry-after": String(rate.retryAfterSeconds) });
    }
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return json(415, { ok: false, reason: "bad_request", requestId });
    }
    const bodyText = await readCappedBody(request, MAX_BODY_BYTES);
    if (bodyText === null) return json(413, { ok: false, reason: "bad_request", requestId });
    let url: unknown;
    try {
      url = (JSON.parse(bodyText) as { url?: unknown })?.url;
    } catch {
      url = undefined;
    }
    if (typeof url !== "string" || url.trim().length === 0 || url.length > MAX_URL_CHARS) {
      return json(400, { ok: false, reason: "bad_request", requestId });
    }

    const result = await readOfferUrl(url, { signal: request.signal });
    return json(200, { ...result, requestId });
  } catch {
    logServerError({ requestId, code: "READ_URL_ERROR", status: 500, durationMs: Date.now() - startedAt });
    return json(500, { ok: false, reason: "failed", requestId });
  }
}
