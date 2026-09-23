import { describe, it, expect } from "vitest";
import { priceRule, extractPriceObservations } from "./price-rule";

const amounts = (text: string) => extractPriceObservations(text).map((p) => p.amount);

describe("priceRule", () => {
  it("extracts amount + currency from Arabic (amount before currency)", () => {
    const r = priceRule.apply("السعر الإجمالي ٣٢٠٠ ر.س لكل شخص");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.confidenceType).toBe("exact");
    expect(r.facts.price?.evidence).toContain("٣٢٠٠");
  });

  it("extracts amount + currency from English (currency before amount)", () => {
    const r = priceRule.apply("Total price SAR 3,200 per person");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.evidence).toContain("3,200");
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

  it("a per-person rate beside a total", () => {
    expect(amounts("السعر الإجمالي 8,400 ريال. السعر 4,200 ريال للشخص.")).toEqual([8400]);
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
