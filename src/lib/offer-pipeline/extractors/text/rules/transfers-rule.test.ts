import { describe, it, expect } from "vitest";
import { transfersRule } from "./transfers-rule";

describe("transfersRule", () => {
  it("detects included transfer in Arabic", () => {
    const r = transfersRule.apply("استقبال وتوصيل خاص من المطار");
    expect(r.facts.transfer?.value).toEqual({ included: true });
    expect(r.facts.transfer?.confidenceType).toBe("exact");
    expect(r.facts.transfer?.evidence.length).toBeGreaterThan(0);
  });

  it("detects excluded transfer in Arabic", () => {
    expect(transfersRule.apply("التوصيل غير مشمول").facts.transfer?.value).toEqual({ included: false });
  });

  it("detects included transfer in English", () => {
    expect(transfersRule.apply("Airport transfers included").facts.transfer?.value).toEqual({ included: true });
  });

  it("does NOT decide from a bare mention (adds a warning instead)", () => {
    const r = transfersRule.apply("يتوفر توصيل عند الطلب");
    expect(r.facts.transfer).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });

  it("returns nothing when transfer is not mentioned", () => {
    const r = transfersRule.apply("عرض مميز");
    expect(r.facts).toEqual({});
    expect(r.warnings).toEqual([]);
  });
});

/**
 * Transfers is a REQUIRED field, so a phrasing the rule misses is reported to
 * the traveller as "التحويلات غير مذكورة" about an offer that did state them.
 * These are the wordings real agency offers use.
 */
describe("transfersRule — the wordings a real offer uses", () => {
  const included = (text: string) => transfersRule.apply(text).facts.transfer?.value;

  it("«استقبال وتوديع» — the meet-and-greet pair", () => {
    expect(included("استقبال وتوديع من المطار")).toEqual({ included: true });
    expect(included("استقبال وتوصيل من المطار")).toEqual({ included: true });
  });

  it("«شامل/يشمل» followed by the transport word", () => {
    expect(included("شامل التنقلات من وإلى المطار")).toEqual({ included: true });
    expect(included("يشمل النقل من المطار")).toEqual({ included: true });
    expect(included("تشمل المواصلات الداخلية")).toEqual({ included: true });
    expect(included("مع التوصيل من المطار")).toEqual({ included: true });
  });

  it("the transport word followed by its status", () => {
    expect(included("التنقلات مشمولة")).toEqual({ included: true });
    expect(included("الترحيل مجاني")).toEqual({ included: true });
    expect(included("ترانسفير خاص")).toEqual({ included: true });
  });

  it("English wordings", () => {
    expect(included("Complimentary airport transfers")).toEqual({ included: true });
    expect(included("Meet and greet at the airport")).toEqual({ included: true });
  });

  it("negation still wins over any of them", () => {
    expect(included("التنقلات غير مشمولة")).toEqual({ included: false });
    expect(included("بدون مواصلات")).toEqual({ included: false });
    expect(included("شامل الإفطار، النقل غير مشمول")).toEqual({ included: false });
  });
});
