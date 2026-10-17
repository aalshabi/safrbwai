/**
 * Fetches a public offer page for the user, server-side, with the SSRF guard
 * on every connection and every redirect, a total time limit, a size cap that
 * also bounds decompressed content, HTML/plain-text only, and robots.txt
 * honoured. Cookies are never sent or kept; nothing is stored or logged.
 */

import http from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import type { Readable } from "node:stream";
import { READER_AGENT, isAllowedByRobots } from "./robots";
import { BlockedAddressError, checkTargetUrl, createGuardedLookup, isBlockedAddress } from "./ssrf";

export const PAGE_TIMEOUT_MS = 8_000;
export const PAGE_MAX_BYTES = 2 * 1024 * 1024;
// RFC 9309 asks crawlers to parse at least the first 500 KiB.
const ROBOTS_MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 4;
export const READER_USER_AGENT = `Mozilla/5.0 (compatible; ${READER_AGENT}/1.0; +https://www.safrbwai.com/privacy)`;

export type FetchRefusal =
  | "invalid_url"
  | "blocked_address"
  | "robots_disallowed"
  | "not_found"
  | "http_error"
  | "not_html"
  | "too_large"
  | "timeout"
  | "unreachable"
  | "too_many_redirects";

export type FetchResult =
  | { ok: true; finalUrl: string; body: string; contentType: string }
  | { ok: false; reason: FetchRefusal; finalUrl?: string };

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  /** Tests only: which addresses count as blocked (default: the SSRF guard). */
  isBlocked?: (address: string) => boolean;
  /** Tests only: allow a local test server's random port. */
  allowAnyPort?: boolean;
  signal?: AbortSignal;
}

class FetchFailure extends Error {
  constructor(readonly reason: FetchRefusal) {
    super(reason);
  }
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function decoderFor(encoding: string | undefined, stream: Readable): Readable {
  switch ((encoding ?? "").trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return stream.pipe(createGunzip());
    case "deflate":
      return stream.pipe(createInflate());
    case "br":
      return stream.pipe(createBrotliDecompress());
    case "":
    case "identity":
      return stream;
    default:
      throw new FetchFailure("not_html");
  }
}

/** One GET, no redirect following; the body is read only when `wantBody`. */
function getOnce(url: URL, opts: Required<Pick<FetchOptions, "maxBytes">> & FetchOptions, signal: AbortSignal, wantBody: (res: http.IncomingMessage) => boolean): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          "user-agent": READER_USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "accept-language": "ar,en;q=0.8",
          "accept-encoding": "gzip, deflate, br",
        },
        lookup: createGuardedLookup(opts.isBlocked ?? isBlockedAddress) as never,
        signal,
        // A fresh connection per request: nothing is shared with other users.
        agent: false,
      },
      (res) => {
        if (!wantBody(res)) {
          // Close the connection instead of draining it: a redirect or a
          // non-page response could otherwise keep downloading after we return.
          res.destroy();
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.alloc(0) });
          return;
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > opts.maxBytes && !res.headers["content-encoding"]) {
          res.destroy();
          reject(new FetchFailure("too_large"));
          return;
        }
        let stream: Readable;
        try {
          stream = decoderFor(res.headers["content-encoding"] as string | undefined, res);
        } catch (error) {
          res.destroy();
          reject(error);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          // The cap applies to decompressed bytes, so a small compressed
          // response cannot expand into gigabytes.
          if (size > opts.maxBytes) {
            res.destroy();
            stream.destroy();
            reject(new FetchFailure("too_large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
        stream.on("error", () => reject(new FetchFailure("unreachable")));
      }
    );
    req.on("error", (error) => {
      if (error instanceof BlockedAddressError || (error as { cause?: unknown }).cause instanceof BlockedAddressError) {
        reject(new FetchFailure("blocked_address"));
      } else if (signal.aborted) {
        reject(new FetchFailure("timeout"));
      } else {
        reject(new FetchFailure("unreachable"));
      }
    });
    req.end();
  });
}

/** GET following up to MAX_REDIRECTS redirects, each hop re-checked. */
async function getFollowing(
  start: URL,
  opts: Required<Pick<FetchOptions, "maxBytes">> & FetchOptions,
  signal: AbortSignal,
  acceptBody: (res: http.IncomingMessage) => boolean
): Promise<{ url: URL; res: RawResponse }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await getOnce(url, opts, signal, (r) => !((r.statusCode ?? 0) >= 300 && (r.statusCode ?? 0) < 400) && acceptBody(r));
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      let next: URL;
      try {
        next = new URL(res.headers.location, url);
      } catch {
        throw new FetchFailure("http_error");
      }
      const check = checkTargetUrl(next.toString(), opts);
      if (!check.ok) throw new FetchFailure(check.reason);
      url = check.url;
      continue;
    }
    return { url, res };
  }
  throw new FetchFailure("too_many_redirects");
}

const isTextual = (contentType: string) => /^(text\/html|application\/xhtml\+xml|text\/plain)\b/i.test(contentType.trim());

/** Decode with the declared charset (header, then <meta>), defaulting to UTF-8. */
export function decodeBody(body: Buffer, contentType: string): string {
  const fromHeader = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  const head = body.subarray(0, 2048).toString("latin1");
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(body);
    } catch {
      // Unknown label: try the next.
    }
  }
  return body.toString("utf8");
}

async function robotsAllow(url: URL, opts: Required<Pick<FetchOptions, "maxBytes">> & FetchOptions, signal: AbortSignal): Promise<boolean> {
  try {
    const { res } = await getFollowing(new URL("/robots.txt", url), { ...opts, maxBytes: ROBOTS_MAX_BYTES }, signal, () => true);
    // No robots.txt (4xx) means no restriction; a server error means unknown,
    // which RFC 9309 treats as disallowed.
    if (res.status >= 500) return false;
    if (res.status !== 200) return true;
    return isAllowedByRobots(decodeBody(res.body, String(res.headers["content-type"] ?? "")), url.pathname + url.search);
  } catch (error) {
    if (!(error instanceof FetchFailure)) return false;
    // A robots.txt that cannot be reached counts as a full disallow (RFC 9309):
    // the page is not fetched, and the user is told the site was unreachable.
    if (error.reason === "blocked_address" || error.reason === "timeout" || error.reason === "unreachable") throw error;
    // One too large to read is a disallow too; one behind too many or invalid
    // redirects counts as absent.
    return error.reason !== "too_large";
  }
}

export async function fetchPublicPage(rawUrl: string, options: FetchOptions = {}): Promise<FetchResult> {
  const opts = { ...options, maxBytes: options.maxBytes ?? PAGE_MAX_BYTES };
  const check = checkTargetUrl(rawUrl, opts);
  if (!check.ok) return { ok: false, reason: check.reason };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? PAGE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  let lastUrl: URL = check.url;
  try {
    if (!(await robotsAllow(check.url, opts, controller.signal))) return { ok: false, reason: "robots_disallowed" };
    const { url, res } = await getFollowing(check.url, opts, controller.signal, (r) =>
      isTextual(String(r.headers["content-type"] ?? ""))
    );
    lastUrl = url;
    // A redirect may lead to a page the site's robots.txt excludes.
    if (url.origin !== check.url.origin || url.pathname !== check.url.pathname) {
      if (!(await robotsAllow(url, opts, controller.signal))) return { ok: false, reason: "robots_disallowed", finalUrl: url.toString() };
    }
    if (res.status === 404 || res.status === 410) return { ok: false, reason: "not_found", finalUrl: url.toString() };
    if (res.status < 200 || res.status >= 300) return { ok: false, reason: "http_error", finalUrl: url.toString() };
    const contentType = String(res.headers["content-type"] ?? "");
    if (!isTextual(contentType)) return { ok: false, reason: "not_html", finalUrl: url.toString() };
    return { ok: true, finalUrl: url.toString(), body: decodeBody(res.body, contentType), contentType };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, reason: "timeout", finalUrl: lastUrl.toString() };
    if (error instanceof FetchFailure) return { ok: false, reason: error.reason, finalUrl: lastUrl.toString() };
    return { ok: false, reason: "unreachable", finalUrl: lastUrl.toString() };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    // Ends any connection still open, so nothing keeps downloading after we return.
    controller.abort();
  }
}
