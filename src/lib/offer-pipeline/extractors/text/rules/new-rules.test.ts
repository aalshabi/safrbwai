import { describe, it, expect } from "vitest";
import { taxesRule } from "./taxes-rule";
import { cancellationRule } from "./cancellation-rule";
import { accommodationRule } from "./accommodation-rule";

describe("taxesRule", () => {
  it("extracts an explicit inclusion", () => {
    const r = taxesRule.apply("السعر شامل الضرائب والرسوم");
    expect(r.facts.taxes?.value).toEqual({ included: true });
    expect(r.facts.taxes?.confidenceType).toBe("exact");
  });

  it("extracts an explicit exclusion (negation wins)", () => {
    expect(taxesRule.apply("السعر غير شامل الضرائب").facts.taxes?.value).toEqual({ included: false });
    expect(taxesRule.apply("excluding all taxes").facts.taxes?.value).toEqual({ included: false });
  });

  it("warns instead of guessing when taxes are mentioned without a status", () => {
    const r = taxesRule.apply("تطبق الضرائب حسب النظام");
    expect(r.facts.taxes).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });

  it("returns nothing when taxes are never mentioned", () => {
    expect(taxesRule.apply("عرض إلى دبي 5 ليالٍ").facts).toEqual({});
  });
});

describe("taxesRule — included sections", () => {
  it("reads «جميع الضرائب» listed under «الخدمات المشمولة» as included", () => {
    const r = taxesRule.apply("### الخدمات المشمولة\n\n- 6 وجبات إفطار.\n- جميع الضرائب.");
    expect(r.facts.taxes?.value).toEqual({ included: true });
    expect(r.facts.taxes?.evidence).toBe("جميع الضرائب.");
  });

  it("does not read entry fees listed as included as a taxes statement", () => {
    expect(taxesRule.apply("### الخدمات المشمولة\n- رسوم دخول المزارات.").facts.taxes).toBeUndefined();
  });

  it("taxes listed under an exclusion heading read as excluded", () => {
    expect(taxesRule.apply("### غير مشمول\n- جميع الضرائب.").facts.taxes?.value).toEqual({ included: false });
    expect(taxesRule.apply("### Not included\n- Taxes").facts.taxes?.value).toEqual({ included: false });
  });
});

describe("cancellationRule", () => {
  it("extracts the policy wording verbatim as its own evidence", () => {
    const r = cancellationRule.apply("الحجز غير قابل للاسترداد بعد التأكيد");
    expect(r.facts.cancellationPolicy?.value).toBe("غير قابل للاسترداد");
    expect(r.facts.cancellationPolicy?.evidence).toBe("غير قابل للاسترداد");
  });

  it("extracts English policies", () => {
    expect(cancellationRule.apply("Free cancellation up to 48h").facts.cancellationPolicy?.value).toMatch(/free cancellation/i);
    expect(cancellationRule.apply("This rate is non-refundable").facts.cancellationPolicy?.value).toMatch(/non-refundable/i);
  });

  it("returns nothing when no policy is stated", () => {
    expect(cancellationRule.apply("عرض إلى دبي 5 ليالٍ").facts).toEqual({});
  });
});

describe("accommodationRule", () => {
  it("extracts a stated star category", () => {
    expect(accommodationRule.apply("الإقامة في فندق 5 نجوم").facts.accommodation?.value).toBe("فندق 5 نجوم");
    expect(accommodationRule.apply("stay at a 4-star hotel").facts.accommodation?.value).toMatch(/4-star/i);
  });

  it("handles Arabic-Indic digits in the category", () => {
    expect(accommodationRule.apply("فندق ٥ نجوم بإطلالة").facts.accommodation?.value).toBe("فندق ٥ نجوم");
  });

  it("never guesses a hotel NAME — warns instead", () => {
    const r = accommodationRule.apply("الإقامة في فندق الريتز بدبي");
    expect(r.facts.accommodation).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });
});

// Destination coverage lives in ./destination-rule.test.ts (two-tier matching).
