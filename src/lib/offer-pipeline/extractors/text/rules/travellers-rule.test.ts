import { describe, it, expect } from "vitest";
import { travellersRule } from "./travellers-rule";

describe("travellersRule", () => {
  it("extracts adults and children from Arabic", () => {
    const r = travellersRule.apply("العدد ٢ بالغين و 1 طفل");
    expect(r.facts.travelers?.value).toEqual({ adults: 2, children: 1 });
    expect(r.facts.travelers?.confidenceType).toBe("exact");
    expect(r.facts.travelers?.evidence.length).toBeGreaterThan(0);
  });

  it("extracts adults from English", () => {
    expect(travellersRule.apply("Booking for 2 adults").facts.travelers?.value).toEqual({ adults: 2 });
  });

  it("does NOT invent counts when none are numbered", () => {
    expect(travellersRule.apply("رحلة عائلية ممتعة").facts.travelers).toBeUndefined();
  });

  it("returns nothing for unrelated text", () => {
    expect(travellersRule.apply("طقس جميل ومناظر خلابة").facts).toEqual({});
  });

  // Regression: the Arabic dual carries the count inside the word itself, so
  // "لشخصين" used to be missed entirely.
  it("extracts the Arabic dual person forms as 2 adults", () => {
    for (const text of ["عرض إلى دبي لشخصين شامل الإفطار", "باقة شهر العسل لزوجين", "رحلة لفردين"]) {
      expect(travellersRule.apply(text).facts.travelers?.value).toEqual({ adults: 2 });
    }
  });

  it("extracts the singular person form as 1 adult", () => {
    expect(travellersRule.apply("عرض لشخص واحد فقط").facts.travelers?.value).toEqual({ adults: 1 });
  });

  // Regression: a lone "0 children" states an absence and must not be rendered
  // as a confirmed "أطفال: ٠".
  it("drops a children count of zero when no adult count is known", () => {
    expect(travellersRule.apply("رحلة مع 0 أطفال").facts.travelers).toBeUndefined();
  });

  it("keeps an explicit zero children when it qualifies a known adult count", () => {
    expect(travellersRule.apply("2 adults and 0 children").facts.travelers?.value).toEqual({ adults: 2, children: 0 });
  });
});

describe("price tiers", () => {
  it("does not read «لـ4 أشخاص» after a price as the party", () => {
    expect(travellersRule.apply("الأسعار: 12,100 ريال لـ4 أشخاص").facts.travelers).toBeUndefined();
    expect(travellersRule.apply("الأسعار: 18,810 ريال لـ14 أشخاص").facts.travelers).toBeUndefined();
    expect(travellersRule.apply("الأسعار: 12,100 ريال سعودي لـ4 أشخاص، 16,500 ريال سعودي لـ6 أشخاص").facts.travelers).toBeUndefined();
    expect(travellersRule.apply("Prices: 12,100 SAR for 4 persons").facts.travelers).toBeUndefined();
    expect(travellersRule.apply("Prices: SAR 12,100 for 4 persons").facts.travelers).toBeUndefined();
  });
});
