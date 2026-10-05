import { describe, it, expect } from "vitest";
import { priceRule, extractPriceObservations } from "./price-rule";

const amounts = (text: string) => extractPriceObservations(text).map((p) => p.amount);

describe("priceRule", () => {
  it("extracts amount + currency from Arabic (amount before currency)", () => {
    const r = priceRule.apply("السعر الإجمالي ٣٢٠٠ ر.س لكل شخص");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.confidenceType).toBe("exact");
    expect(r.facts.price?.evidence).toContain("٣٢٠٠");
    expect(r.facts.perPersonPrice?.value).toEqual({ amount: 3200, currency: "SAR" });
  });

  it("extracts amount + currency from English (currency before amount)", () => {
    const r = priceRule.apply("Total price SAR 3,200 per person");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.evidence).toContain("3,200");
    expect(r.facts.perPersonPrice?.value).toEqual({ amount: 3200, currency: "SAR" });
  });

  it("recognizes standalone English Total labels as the trip total", () => {
    for (const text of ["Total: SAR 2,000.", "Total SAR 2,000."]) {
      const r = priceRule.apply(text);
      expect(r.facts.totalPrice?.value).toEqual({ amount: 2000, currency: "SAR" });
      expect(r.observations?.prices).toEqual([
        expect.objectContaining({ amount: 2000, currency: "SAR", basis: "total" }),
      ]);
    }
  });

  it("handles the $ symbol", () => {
    const r = priceRule.apply("Package for $1200 only");
    expect(r.facts.price?.value).toEqual({ amount: 1200, currency: "USD" });
  });

  it("does NOT extract a bare number with no adjacent currency", () => {
    expect(priceRule.apply("الرحلة لمدة 3200 دقيقة تقريبًا").facts.price).toBeUndefined();
  });

  it("returns nothing for unrelated text (no fabrication)", () => {
    const r = priceRule.apply("رحلة جميلة إلى مكان رائع");
    expect(r.facts).toEqual({});
    expect(r.warnings).toEqual([]);
  });
});

/**
 * A second price stated with a bare "السعر" label used to be dropped, so the
 * offer's most expensive mistake — two different totals — was silently resolved
 * to the first one and shown as confirmed.
 */
describe("priceRule — a bare price label competes with the stated total", () => {
  it("keeps both when the second says only «السعر»", () => {
    expect(amounts("دبي ٤ ليالٍ. السعر الإجمالي 5,000 ريال. السعر 6,000 ريال.")).toEqual([
      5000, 6000,
    ]);
  });

  it("still confirms the explicitly final price, whichever comes first", () => {
    const r = priceRule.apply("دبي ٤ ليالٍ. السعر 6,000 ريال. السعر الإجمالي 5,000 ريال.");
    expect(r.facts.price?.value).toEqual({ amount: 5000, currency: "SAR" });
    expect(r.observations?.prices?.map((p) => p.amount)).toEqual([5000, 6000]);
  });

  it("competes with «التكلفة» and «المبلغ» too", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. التكلفة 7,000 ريال.")).toEqual([5000, 7000]);
    expect(amounts("السعر الإجمالي 5,000 ريال. المبلغ 7,000 ريال.")).toEqual([5000, 7000]);
  });

  it("competes even when no price is labelled final", () => {
    expect(amounts("السعر 5,000 ريال. السعر 6,000 ريال.")).toEqual([5000, 6000]);
  });

  it("reports the same amount written twice only once", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر ٥٠٠٠ ريال.")).toEqual([5000]);
  });
});

describe("priceRule — what must NOT be treated as a competing total", () => {
  it("an itemized component: «سعر الفندق» ends the clause with the component", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. سعر الفندق 3,000 ريال.")).toEqual([5000]);
  });

  it("an unlabelled component amount", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. الطيران 2,000 ريال.")).toEqual([5000]);
  });

  // English puts the component BEFORE the price word, where the clause-end
  // anchor cannot see it — so "Hotel price" needs its own rejection.
  it("an English component price, whose word order is the reverse of Arabic", () => {
    expect(amounts("Total price SAR 5,000. Hotel price SAR 3,000.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Flight cost SAR 2,000.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Ticket cost SAR 1,200.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Per-night price SAR 700.")).toEqual([5000, 700]);
    expect(amounts("Total price SAR 5,000. Hotel's price SAR 3,000.")).toEqual([5000]);
  });

  it("does not promote an English component total to the trip total", () => {
    const result = priceRule.apply("Hotel total: SAR 2,000.");
    expect(result.facts.totalPrice).toBeUndefined();
    expect(result.observations?.prices).toEqual([
      expect.objectContaining({ amount: 2000, currency: "SAR", basis: "unspecified" }),
    ]);
    expect(amounts("Total: SAR 5,000. Hotel total: SAR 2,000.")).toEqual([5000]);
  });

  it("but an English label naming the whole offer still competes", () => {
    expect(amounts("Total price SAR 5,000. Package price SAR 6,000.")).toEqual([5000, 6000]);
    expect(amounts("Total price SAR 5,000. Price SAR 6,000.")).toEqual([5000, 6000]);
  });

  it("a per-person rate beside a total", () => {
    const result = priceRule.apply("السعر الإجمالي 8,400 ريال. السعر 4,200 ريال للشخص.");
    expect(result.observations?.prices?.map(({ amount, basis }) => ({ amount, basis }))).toEqual([
      { amount: 8400, basis: "total" },
      { amount: 4200, basis: "per_person" },
    ]);
    expect(result.facts.totalPrice?.value).toEqual({ amount: 8400, currency: "SAR" });
    expect(result.facts.perPersonPrice?.value).toEqual({ amount: 4200, currency: "SAR" });
  });

  it("keeps a per-night rate separate from the trip total", () => {
    const result = priceRule.apply("Total price SAR 2,400. Price SAR 480 per night.");
    expect(result.facts.totalPrice?.value).toEqual({ amount: 2400, currency: "SAR" });
    expect(result.facts.perNightPrice?.value).toEqual({ amount: 480, currency: "SAR" });
    expect(result.facts.perPersonPrice).toBeUndefined();
  });

  it("does not promote an unqualified stated price to a trip total", () => {
    const result = priceRule.apply("السعر 4,200 ريال.");
    expect(result.facts.statedPrice?.value).toEqual({ amount: 4200, currency: "SAR" });
    expect(result.facts.totalPrice).toBeUndefined();
  });

  it("adult and child rates, which legitimately differ", () => {
    expect(amounts("السعر 4,200 ريال للبالغ. السعر 2,500 ريال للطفل.")).toEqual([4200]);
    expect(amounts("Price USD 900 per adult. Price USD 500 per child.")).toEqual([900]);
  });

  it("the same price restated in another currency", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر 1,330 دولار.")).toEqual([5000]);
  });

  it("a cross-currency conflict between two FINAL prices is still reported", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر الإجمالي 1,330 دولار.")).toEqual([
      5000, 1330,
    ]);
  });

  it("leaves a plain single-price offer untouched", () => {
    expect(amounts("باكج ماليزيا 5 ليالٍ. السعر 4,200 ريال شامل الطيران.")).toEqual([4200]);
    expect(amounts("الفندق 3,000 ريال والطيران 2,000 ريال.")).toEqual([3000]);
  });
});
