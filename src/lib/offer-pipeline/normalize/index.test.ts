import { describe, it, expect } from "vitest";
import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import { normalizeFacts, normalizeExtraction } from "./index";

describe("normalizeFacts", () => {
  it("canonicalizes values across all fact kinds", () => {
    const facts: ExtractedOfferFacts = {
      price: { value: { amount: 3200, currency: "ريال" }, evidence: "٣٢٠٠ ريال", confidenceType: "exact" },
      currency: { value: "ر.س", evidence: "ر.س", confidenceType: "exact" },
      nights: { value: 5, evidence: "٥ ليالٍ", confidenceType: "exact" },
      travelers: { value: { adults: 2, children: 0 }, evidence: "٢ بالغين", confidenceType: "exact" },
      board: { value: "شامل الإفطار", evidence: "شامل الإفطار", confidenceType: "exact" },
      baggage: { value: "٢٠ كجم", evidence: "٢٠ كجم", confidenceType: "exact" },
      insurance: { value: false, evidence: "غير مشمول", confidenceType: "exact" },
      roomType: { value: "  غرفة ديلوكس  ", evidence: "غرفة ديلوكس", confidenceType: "exact" },
      transitDuration: { value: { minutes: 420 }, evidence: "٧ ساعات", confidenceType: "exact" },
      stopCount: { value: 1, evidence: "توقف واحد", confidenceType: "exact" },
      airportChange: { value: false, evidence: "بدون تغيير مطار", confidenceType: "exact" },
    };

    const out = normalizeFacts(facts);
    expect(out.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(out.currency?.value).toBe("SAR");
    expect(out.nights?.value).toBe(5);
    expect(out.travelers?.value).toEqual({ adults: 2, children: 0 });
    expect(out.board?.value).toBe("BB");
    expect(out.baggage?.value).toBe("20kg");
    expect(out.insurance?.value).toBe(false);
    expect(out.roomType?.value).toBe("غرفة ديلوكس");
    expect(out.transitDuration?.value).toEqual({ minutes: 420 });
    expect(out.stopCount?.value).toBe(1);
    expect(out.airportChange?.value).toBe(false);
  });

  it("preserves evidence and confidenceType exactly (invariant)", () => {
    const facts: ExtractedOfferFacts = {
      board: { value: "half board", evidence: "Half Board included", confidenceType: "exact" },
    };
    const out = normalizeFacts(facts);
    expect(out.board?.evidence).toBe("Half Board included"); // unchanged
    expect(out.board?.confidenceType).toBe("exact"); // unchanged
  });

  it("does not invent facts that were absent", () => {
    const out = normalizeFacts({ nights: { value: 3, evidence: "3 nights", confidenceType: "exact" } });
    expect(out.price).toBeUndefined();
    expect(out.visa).toBeUndefined();
    expect(Object.keys(out)).toEqual(["nights"]);
  });

  it("drops a fact whose value cannot be normalized rather than guessing", () => {
    const out = normalizeFacts({ nights: { value: 0, evidence: "0", confidenceType: "exact" } });
    expect(out.nights).toBeUndefined();
  });
});

describe("normalizeExtraction", () => {
  it("normalizes facts and dedupes warnings together", () => {
    const out = normalizeExtraction({
      facts: { currency: { value: "دولار", evidence: "دولار", confidenceType: "exact" } },
      warnings: [
        { ar: "تكرار", en: "dup" },
        { ar: "تكرار", en: "dup" },
      ],
    });
    expect(out.facts.currency?.value).toBe("USD");
    expect(out.warnings).toEqual([{ ar: "تكرار", en: "dup" }]);
  });
});
