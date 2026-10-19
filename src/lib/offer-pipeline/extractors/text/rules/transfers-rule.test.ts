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
    expect(
      transfersRule.apply("Includes breakfast and airport transfers").facts.transfer?.value
    ).toEqual({ included: true });
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

  it("meet-and-assist and seaplane wordings", () => {
    expect(included("الاستقبال والمساعدة في المطار.")).toEqual({ included: true });
    expect(included("نقل ذهابًا وإيابًا بالطائرة المائية.")).toEqual({ included: true });
    expect(included("Seaplane transfers")).toEqual({ included: true });
  });

  it("an item listed under «الخدمات المشمولة» is included; under «غير مشمول» it is not", () => {
    expect(included("### الخدمات المشمولة\n\n- سيارة خاصة.\n- التنقلات بين المدن.")).toEqual({ included: true });
    expect(included("### الإقامة\n\n- التنقلات بين المدن.")).toBeUndefined();
    expect(included("الخدمات المشمولة:\n- التنقلات غير مشمولة.")).toEqual({ included: false });
  });

  it("a transfer offered for a fee or unavailable is not an inclusion", () => {
    expect(included("Seaplane transfers available for an additional charge")).toBeUndefined();
    expect(included("لا تتوفر خدمة الاستقبال والمساعدة في المطار")).toBeUndefined();
    expect(included("نقل بالقارب السريع مقابل رسوم إضافية")).toBeUndefined();
  });

  it("an optional transfer does not hide a later included one", () => {
    expect(included("Seaplane transfers available for an additional charge. Airport transfers included.")).toEqual({ included: true });
  });

  it("an optional service in another clause does not cancel an included transfer", () => {
    expect(included("Airport transfers included; excursions optional")).toEqual({ included: true });
    expect(included("الاستقبال والتوديع من وإلى المطار، والرحلات الاختيارية مقابل رسوم إضافية")).toEqual({ included: true });
  });

  it("a transfer listed under «غير مشمول» is excluded", () => {
    expect(included("### Not included\n- Seaplane transfers")).toEqual({ included: false });
    expect(included("### غير مشمول\n- النقل بالطائرة المائية.")).toEqual({ included: false });
  });

  it("air transport listed as included is not a ground transfer", () => {
    expect(included("### الخدمات المشمولة\n- النقل الجوي الداخلي (تذاكر طيران).")).toBeUndefined();
  });

  it("a clause that says the package does not include the service is not an inclusion", () => {
    expect(included("لا تشمل الباقة خدمة الاستقبال والمساعدة في المطار")).toBeUndefined();
    expect(included("The package does not include seaplane transfers")).toEqual({ included: false });
  });

  it("a separately priced transfer is not an inclusion", () => {
    expect(included("Seaplane transfers available for USD 100")).toBeUndefined();
    expect(included("نقل بالقارب السريع بسعر 300 ريال")).toBeUndefined();
  });

  it("a package total in the same clause does not make the transfer a paid extra", () => {
    expect(included("والإجمالي 2,000 ريال شامل الضرائب والإفطار والنقل من وإلى المطار.")).toEqual({ included: true });
    expect(included("Private airport transfers for 2 persons")).toEqual({ included: true });
  });
});
