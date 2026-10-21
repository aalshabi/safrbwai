import { describe, expect, it, vi } from "vitest";
import { createInMemoryRateLimiter } from "@/lib/offer-pipeline/api/rate-limit";
import { getWatiConfig, isNewsletterEnabled } from "./config";
import { createNewsletterHandler } from "./handler";
import { normalizeWhatsAppNumber } from "./phone";
import { NEWSLETTER_ATTRIBUTE, WatiNewsletterStore, type NewsletterStore } from "./store";

describe("normalizeWhatsAppNumber", () => {
  it.each([
    ["0501234567", "966501234567"],
    ["050 123 4567", "966501234567"],
    ["501234567", "966501234567"],
    ["+966 50 123 4567", "966501234567"],
    ["00966501234567", "966501234567"],
    ["٠٥٠١٢٣٤٥٦٧", "966501234567"],
    ["+971 50 123 4567", "971501234567"],
  ])("reads %s", (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected);
  });

  it.each(["", "12345", "0112345678", "+966112345678", "0501234", "abc", "+0123456789"])("rejects %s", (input) => {
    expect(normalizeWhatsAppNumber(input)).toBeNull();
  });
});

describe("newsletter config", () => {
  const full = { NEWSLETTER_ENABLED: "true", WATI_API_ENDPOINT: "https://live.example/123/", WATI_API_TOKEN: "t" };

  it("is off unless enabled and fully configured over https", () => {
    expect(isNewsletterEnabled({})).toBe(false);
    expect(isNewsletterEnabled({ ...full, NEWSLETTER_ENABLED: "false" })).toBe(false);
    expect(isNewsletterEnabled({ ...full, WATI_API_TOKEN: "" })).toBe(false);
    expect(isNewsletterEnabled({ ...full, WATI_API_ENDPOINT: "http://live.example" })).toBe(false);
    expect(getWatiConfig(full)).toEqual({ endpoint: "https://live.example/123", token: "t" });
  });
});

describe("WatiNewsletterStore", () => {
  it("adds the number, then sets the newsletter attribute and consent time, and nothing else", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const store = new WatiNewsletterStore({ endpoint: "https://live.example/123", token: "secret" }, fetchImpl as unknown as typeof fetch);
    await store.subscribe("966501234567", new Date("2026-10-21T20:00:00Z"));
    const calls = fetchImpl.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(([url]) => url)).toEqual([
      "https://live.example/123/api/v1/addContact/966501234567",
      "https://live.example/123/api/v1/updateContactAttributes/966501234567",
    ]);
    const [, init] = calls[1];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
    expect(JSON.parse(init.body as string)).toEqual({
      customParams: [
        { name: NEWSLETTER_ATTRIBUTE, value: "subscribed" },
        { name: "newsletter_consent_at", value: "2026-10-21T20:00:00.000Z" },
        { name: "newsletter_source", value: "safrbwai.com" },
      ],
    });
  });

  it("subscribes a number Wati already has even when addContact refuses it", async () => {
    const fetchImpl = vi.fn(async (url: string) => new Response("{}", { status: url.includes("addContact") ? 400 : 200 }));
    const store = new WatiNewsletterStore({ endpoint: "https://live.example/123", token: "t" }, fetchImpl as unknown as typeof fetch);
    await expect(store.subscribe("966501234567", new Date())).resolves.toBeUndefined();
  });

  it("throws when Wati does not confirm the attributes", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 401 }));
    const store = new WatiNewsletterStore({ endpoint: "https://live.example/123", token: "t" }, fetchImpl as unknown as typeof fetch);
    await expect(store.subscribe("966501234567", new Date())).rejects.toThrow();
  });
});

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://safrbwai.test/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function setup(store: NewsletterStore | null = { subscribe: vi.fn(async () => {}) }) {
  const limiter = createInMemoryRateLimiter({ max: 5, windowMs: 60_000 });
  return { store, handle: createNewsletterHandler({ store, rateLimiter: limiter, now: () => new Date("2026-10-21T20:00:00Z") }) };
}

describe("POST /api/newsletter", () => {
  it("subscribes a valid number with consent", async () => {
    const { store, handle } = setup();
    const res = await handle(post({ phone: "0501234567", consent: true, website: "" }));
    expect(res.status).toBe(200);
    expect(store!.subscribe).toHaveBeenCalledWith("966501234567", new Date("2026-10-21T20:00:00Z"));
  });

  it("is unavailable while the newsletter is not configured", async () => {
    const { handle } = setup(null);
    expect((await handle(post({ phone: "0501234567", consent: true }))).status).toBe(503);
  });

  it("requires consent", async () => {
    const { store, handle } = setup();
    const res = await handle(post({ phone: "0501234567", consent: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("CONSENT_REQUIRED");
    expect(store!.subscribe).not.toHaveBeenCalled();
  });

  it("rejects an invalid number, unknown fields and non-JSON bodies", async () => {
    const { store, handle } = setup();
    expect((await (await handle(post({ phone: "123", consent: true }))).json()).error.code).toBe("INVALID_PHONE");
    expect((await handle(post({ phone: "0501234567", consent: true, name: "x" }))).status).toBe(400);
    expect((await handle(post("not json"))).status).toBe(400);
    expect((await handle(post({ phone: "0501234567", consent: true }, { "content-type": "text/plain" }))).status).toBe(400);
    expect(store!.subscribe).not.toHaveBeenCalled();
  });

  it("stops reading a body that grows past the limit without a content-length", async () => {
    const { store, handle } = setup();
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(new Uint8Array(512).fill(32));
        if (pulled > 100) controller.close();
      },
    });
    const request = new Request("https://safrbwai.test/api/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit);
    expect((await handle(request)).status).toBe(400);
    expect(pulled).toBeLessThan(10);
    expect(store!.subscribe).not.toHaveBeenCalled();
  });

  it("answers a filled honeypot as success without subscribing", async () => {
    const { store, handle } = setup();
    expect((await handle(post({ phone: "0501234567", consent: true, website: "spam" }))).status).toBe(200);
    expect(store!.subscribe).not.toHaveBeenCalled();
  });

  it("limits repeated attempts from one client", async () => {
    const { handle } = setup();
    for (let i = 0; i < 5; i++) await handle(post({ phone: "0501234567", consent: true }));
    expect((await handle(post({ phone: "0501234567", consent: true }))).status).toBe(429);
  });

  it("reports a provider failure without logging the number", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handle } = setup({ subscribe: vi.fn(async () => { throw new Error("down"); }) });
    const res = await handle(post({ phone: "0501234567", consent: true }));
    expect(res.status).toBe(502);
    expect(JSON.stringify(error.mock.calls)).not.toContain("501234567");
    error.mockRestore();
  });
});
