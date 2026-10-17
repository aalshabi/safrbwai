// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/offer-input/url/read-url", () => ({ readOfferUrl: vi.fn() }));
vi.mock("@vercel/functions", () => ({ ipAddress: () => undefined }));

import { readOfferUrl } from "@/lib/offer-input/url/read-url";
import { readUrlRateLimiter } from "@/lib/offer-input/url/rate-limit";
import { POST } from "./route";

const request = (body: string, contentType = "application/json", ip = "203.0.113.7") =>
  new Request("https://www.safrbwai.com/api/offer/read-url", {
    method: "POST",
    headers: { "content-type": contentType, "x-forwarded-for": ip },
    body,
  });

afterEach(() => {
  readUrlRateLimiter.reset();
  vi.mocked(readOfferUrl).mockReset();
});

describe("POST /api/offer/read-url", () => {
  it("returns the reading with no-store and never echoes the URL", async () => {
    vi.mocked(readOfferUrl).mockResolvedValue({ ok: true, text: "عرض", finalUrl: "https://example.com/x", signals: [] });
    const res = await POST(request(JSON.stringify({ url: "https://example.com/x?ref=ABC123" })));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, text: "عرض" });
    expect(vi.mocked(readOfferUrl).mock.calls[0][0]).toBe("https://example.com/x?ref=ABC123");
  });

  it.each([
    ["not json", "application/json", 400],
    [JSON.stringify({ url: 42 }), "application/json", 400],
    [JSON.stringify({ url: "" }), "application/json", 400],
    [JSON.stringify({ url: `https://example.com/${"a".repeat(2100)}` }), "application/json", 400],
    [JSON.stringify({ url: "https://example.com" }), "text/plain", 415],
    [JSON.stringify({ url: "https://example.com", pad: "x".repeat(5000) }), "application/json", 413],
  ])("rejects a malformed request (%#)", async (body, type, status) => {
    const res = await POST(request(body, type));
    expect(res.status).toBe(status);
    expect(readOfferUrl).not.toHaveBeenCalled();
  });

  it("refuses an oversized body from its declared length or while streaming, without reading it all", async () => {
    const declared = new Request("https://www.safrbwai.com/api/offer/read-url", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "999999" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect((await POST(declared)).status).toBe(413);

    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1024;
        controller.enqueue(new Uint8Array(1024).fill(32));
      },
    });
    const streamed = new Request("https://www.safrbwai.com/api/offer/read-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: endless,
      duplex: "half",
    } as RequestInit);
    expect((await POST(streamed)).status).toBe(413);
    expect(pulled).toBeLessThan(16 * 1024);
    expect(readOfferUrl).not.toHaveBeenCalled();
  });

  it("rate-limits each caller to 6 reads a minute", async () => {
    vi.mocked(readOfferUrl).mockResolvedValue({ ok: false, reason: "not_found", signals: [] });
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await POST(request(JSON.stringify({ url: "https://example.com" })))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 429]);
    expect((await POST(request(JSON.stringify({ url: "https://example.com" }), "application/json", "198.51.100.9"))).status).toBe(200);
  });

  it("answers a server error without details and logs no URL", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(readOfferUrl).mockRejectedValue(new Error("https://secret.example/path"));
    const res = await POST(request(JSON.stringify({ url: "https://secret.example/path" })));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret.example");
    expect(log.mock.calls.flat().join(" ")).not.toContain("secret.example");
    log.mockRestore();
  });
});
