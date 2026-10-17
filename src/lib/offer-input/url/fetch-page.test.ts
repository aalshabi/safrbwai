// @vitest-environment node
/**
 * Fetch behaviour against a real local HTTP server (no external network).
 * The SSRF guard would refuse 127.0.0.1, so these tests inject a guard that
 * blocks only 127.0.0.2 and allow the server's random port; the production
 * defaults are covered in ssrf.test.ts.
 */

import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { READER_USER_AGENT, fetchPublicPage } from "./fetch-page";

const ARABIC_PAGE = `<!doctype html><html lang="ar"><head><title>عرض دبي</title></head><body><main><p>4 ليالٍ في دبي بسعر 3200 ريال</p></main></body></html>`;
const WINDOWS_1256 = Buffer.from("c7e1d3dad1203332303020d1edc7e120d4c7e3e120c7e1c5ddd8c7d1", "hex"); // «السعر 3200 ريال شامل الإفطار»

let server: Server;
let base: string;
const seen: IncomingHttpHeaders[] = [];
let robotsMode: "normal" | "reset" | "huge" | "loop" = "normal";
let hugeBytesSent = 0;
let hugeClosed = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    seen.push(req.headers);
    const path = req.url ?? "/";
    const html = (body: string | Buffer, extra: Record<string, string> = {}) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...extra });
      res.end(body);
    };
    switch (path) {
      case "/robots.txt":
        if (robotsMode === "reset") return req.socket.destroy();
        if (robotsMode === "huge") {
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("#".repeat(600 * 1024));
          return;
        }
        if (robotsMode === "loop") {
          res.writeHead(302, { location: "/robots.txt" });
          res.end();
          return;
        }
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("User-agent: *\nDisallow: /private\n\nUser-agent: SafrBwaiBot\nDisallow: /nobot\nDisallow: /private\n");
        return;
      case "/offer":
        return html(ARABIC_PAGE, { "set-cookie": "session=abc" });
      case "/win1256":
        res.writeHead(200, { "content-type": "text/html; charset=windows-1256" });
        res.end(WINDOWS_1256);
        return;
      case "/gzip":
        return html(gzipSync(Buffer.from(ARABIC_PAGE)), { "content-encoding": "gzip" });
      case "/bomb":
        return html(gzipSync(Buffer.alloc(5 * 1024 * 1024, 0x61)), { "content-encoding": "gzip" });
      case "/big":
        return html(Buffer.alloc(300 * 1024, 0x61));
      case "/pdf":
        res.writeHead(200, { "content-type": "application/pdf" });
        res.end("%PDF-1.7");
        return;
      case "/redirect-ok":
        res.writeHead(302, { location: "/offer" });
        res.end();
        return;
      case "/redirect-private":
        res.writeHead(302, { location: `http://127.0.0.2:${(server.address() as AddressInfo).port}/offer` });
        res.end();
        return;
      case "/redirect-robots":
        res.writeHead(301, { location: "/private/page" });
        res.end();
        return;
      case "/redirect-ftp":
        res.writeHead(302, { location: "ftp://example.com/file" });
        res.end();
        return;
      case "/loop":
        res.writeHead(302, { location: "/loop" });
        res.end();
        return;
      case "/slow":
        return; // never answers
      case "/huge-binary": {
        // Streams without end until the client closes the connection.
        hugeBytesSent = 0;
        hugeClosed = false;
        res.writeHead(200, { "content-type": "application/octet-stream" });
        const chunk = Buffer.alloc(64 * 1024);
        const pump = () => {
          while (!res.destroyed && res.write(chunk)) hugeBytesSent += chunk.length;
          if (!res.destroyed) res.once("drain", pump);
        };
        res.on("close", () => (hugeClosed = true));
        pump();
        return;
      }
      case "/server-error":
        res.writeHead(500);
        res.end();
        return;
      default:
        res.writeHead(404);
        res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const opts = { isBlocked: (a: string) => a === "127.0.0.2", allowAnyPort: true, timeoutMs: 1_000, maxBytes: 256 * 1024 };

describe("fetchPublicPage", () => {
  it("reads a page, identifies itself honestly and sends no cookies", async () => {
    const result = await fetchPublicPage(`${base}/offer`, opts);
    expect(result).toMatchObject({ ok: true, finalUrl: `${base}/offer` });
    expect(result.ok && result.body).toContain("3200 ريال");
    const last = seen.at(-1)!;
    expect(last["user-agent"]).toBe(READER_USER_AGENT);
    expect(last.cookie).toBeUndefined();
  });

  it("decodes a declared windows-1256 page and gzip-compressed content", async () => {
    const legacy = await fetchPublicPage(`${base}/win1256`, opts);
    expect(legacy.ok && legacy.body).toBe("السعر 3200 ريال شامل الإفطار");
    const gz = await fetchPublicPage(`${base}/gzip`, opts);
    expect(gz.ok && gz.body).toContain("4 ليالٍ في دبي");
  });

  it("follows a same-site redirect and reports the final URL", async () => {
    expect(await fetchPublicPage(`${base}/redirect-ok`, opts)).toMatchObject({ ok: true, finalUrl: `${base}/offer` });
  });

  it.each([
    ["/redirect-private", "blocked_address"],
    ["/redirect-ftp", "invalid_url"],
    ["/loop", "too_many_redirects"],
    ["/private", "robots_disallowed"],
    ["/nobot", "robots_disallowed"],
    ["/redirect-robots", "robots_disallowed"],
    ["/bomb", "too_large"],
    ["/big", "too_large"],
    ["/pdf", "not_html"],
    ["/missing", "not_found"],
    ["/server-error", "http_error"],
    ["/slow", "timeout"],
  ])("refuses %s with %s", async (path, reason) => {
    const result = await fetchPublicPage(`${base}${path}`, { ...opts, timeoutMs: path === "/slow" ? 300 : opts.timeoutMs });
    expect(result).toMatchObject({ ok: false, reason });
  });

  it("refuses the server's own address with the production guard", async () => {
    // allowAnyPort, so that the address check (not the port check) refuses it.
    expect(await fetchPublicPage(`${base}/offer`, { allowAnyPort: true })).toMatchObject({ ok: false, reason: "blocked_address" });
  });

  it("closes a response it does not read, so nothing keeps downloading", async () => {
    expect(await fetchPublicPage(`${base}/huge-binary`, opts)).toMatchObject({ ok: false, reason: "not_html" });
    await new Promise((r) => setTimeout(r, 300));
    expect(hugeClosed).toBe(true);
    const sent = hugeBytesSent;
    await new Promise((r) => setTimeout(r, 200));
    expect(hugeBytesSent).toBe(sent);
    expect(sent).toBeLessThan(8 * 1024 * 1024);
  });

  it.each([
    ["reset", "unreachable"],
    ["huge", "robots_disallowed"],
  ] as const)("does not read the page when robots.txt is unreachable or oversized (%s → %s)", async (mode, reason) => {
    robotsMode = mode;
    const before = seen.length;
    try {
      expect(await fetchPublicPage(`${base}/offer`, opts)).toMatchObject({ ok: false, reason });
      // Only the robots.txt request reached the server, never the page.
      expect(seen.slice(before).length).toBe(1);
    } finally {
      robotsMode = "normal";
    }
  });

  it("treats a robots.txt behind a redirect loop as absent", async () => {
    robotsMode = "loop";
    try {
      expect(await fetchPublicPage(`${base}/offer`, opts)).toMatchObject({ ok: true });
    } finally {
      robotsMode = "normal";
    }
  });

  it("stops when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = fetchPublicPage(`${base}/slow`, { ...opts, timeoutMs: 5_000, signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    expect(await pending).toMatchObject({ ok: false, reason: "timeout" });
  });
});
