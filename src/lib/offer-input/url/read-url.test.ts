import { describe, expect, it, vi } from "vitest";
import { readOfferUrl } from "./read-url";

const page = (body: string, finalUrl = "https://offers.example.com/dubai", contentType = "text/html") =>
  vi.fn().mockResolvedValue({ ok: true, finalUrl, body, contentType });

describe("readOfferUrl", () => {
  it("returns the page text with the link signals", async () => {
    const result = await readOfferUrl("https://bit.ly/x", {
      fetchPage: page("<main><p>عرض دبي 4 ليالٍ بسعر 3200 ريال، غير شامل الطيران</p></main>", "https://booking-deals.com/x"),
    });
    expect(result).toMatchObject({ ok: true, text: "عرض دبي 4 ليالٍ بسعر 3200 ريال، غير شامل الطيران", finalUrl: "https://booking-deals.com/x" });
    expect(result.signals.map((s) => s.code)).toEqual(["shortener", "redirected_elsewhere", "lookalike"]);
  });

  it("reads plain text as is", async () => {
    const result = await readOfferUrl("https://example.com/offer.txt", { fetchPage: page("فندق في جدة 3 ليالٍ بسعر 2100 ريال", undefined, "text/plain") });
    expect(result).toMatchObject({ ok: true, text: "فندق في جدة 3 ليالٍ بسعر 2100 ريال" });
  });

  it("refuses a page built by JavaScript (no text) and over-long text, never truncating", async () => {
    expect(await readOfferUrl("https://example.com/app", { fetchPage: page('<div id="root"></div><script>app()</script>') })).toMatchObject({
      ok: false,
      reason: "no_text",
    });
    const long = `<p>${"فندق بسعر 3200 ريال. ".repeat(1200)}</p>`;
    expect(await readOfferUrl("https://example.com/long", { fetchPage: page(long) })).toMatchObject({ ok: false, reason: "too_long" });
  });

  it("passes a fetch refusal through, still with the link signals", async () => {
    const result = await readOfferUrl("http://bo0king.com/x", {
      fetchPage: vi.fn().mockResolvedValue({ ok: false, reason: "robots_disallowed" }),
    });
    expect(result).toEqual({
      ok: false,
      reason: "robots_disallowed",
      signals: [{ code: "not_https", severity: "warn" }, { code: "lookalike", severity: "warn", detail: "booking.com" }],
    });
  });
});
