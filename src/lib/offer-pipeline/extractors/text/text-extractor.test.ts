import { describe, it, expect } from "vitest";
import { createTextExtractor, extractFactsFromText } from "./text-extractor";

describe("TextExtractor orchestrator", () => {
  it("is an enabled extractor of type 'text'", () => {
    const ex = createTextExtractor();
    expect(ex.type).toBe("text");
    expect(ex.enabled).toBe(true);
  });

  it("merges facts from multiple rules over a full Arabic offer", () => {
    const text = "عرض إلى دبي: إقامة ٥ ليالٍ لشخصين، شاملة الإفطار، السعر الإجمالي ٣٢٠٠ ر.س، التأشيرة غير مشمولة، أمتعة ٢٠ كجم.";
    const res = createTextExtractor().extract({ type: "text", text });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.facts.nights?.value).toBe(5);
    expect(res.facts.board?.value).toBe("BB");
    expect(res.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(res.facts.currency?.value).toBe("SAR");
    expect(res.facts.visa?.value).toBe(false);
    expect(res.facts.baggage?.value).toBe("20kg");
    // every extracted fact carries evidence
    for (const fact of Object.values(res.facts)) {
      expect(fact?.evidence.length).toBeGreaterThan(0);
      expect(fact?.confidenceType).toBe("exact");
    }
  });

  it("merges facts over a full English offer", () => {
    const text = "Dubai package: 5 nights for 2 adults, bed and breakfast, SAR 3,200, visa not included.";
    const { facts } = extractFactsFromText(text);
    expect(facts.nights?.value).toBe(5);
    expect(facts.travelers?.value).toEqual({ adults: 2 });
    expect(facts.board?.value).toBe("BB");
    expect(facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(facts.visa?.value).toBe(false);
  });

  it("returns ok with empty facts (no fabrication) for content-free text", () => {
    const res = createTextExtractor().extract({ type: "text", text: "مرحبًا بكم في رحلتنا القادمة" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.facts).toEqual({});
  });

  it("reports 'empty' for blank text and 'unsupported' for a non-text source", () => {
    const ex = createTextExtractor();
    expect(ex.extract({ type: "text", text: "   " })).toEqual({ ok: false, reason: "empty" });
    expect(ex.extract({ type: "url", url: "https://example.com" })).toEqual({ ok: false, reason: "unsupported" });
  });
});
