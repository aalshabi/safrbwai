import { describe, it, expect } from "vitest";
import { nightsRule } from "./nights-rule";

describe("nightsRule", () => {
  it("extracts nights from Arabic", () => {
    const r = nightsRule.apply("إقامة ٥ ليالٍ في الفندق");
    expect(r.facts.nights?.value).toBe(5);
    expect(r.facts.nights?.confidenceType).toBe("exact");
    expect(r.facts.nights?.evidence).toContain("٥");
  });

  it("extracts nights from English", () => {
    expect(nightsRule.apply("Enjoy 7 nights by the sea").facts.nights?.value).toBe(7);
  });

  it("does NOT treat days as nights (no inference)", () => {
    expect(nightsRule.apply("رحلة لمدة 6 أيام").facts.nights).toBeUndefined();
    expect(nightsRule.apply("a 6 days trip").facts.nights).toBeUndefined();
  });

  it("returns nothing for unrelated text", () => {
    expect(nightsRule.apply("عرض رائع للعائلات").facts).toEqual({});
  });

  // Regression: the full offer sentence must yield 5 — never 0.
  it("extracts 5 (not 0) from a complete Arabic offer sentence", () => {
    const r = nightsRule.apply("عرض إلى دبي لمدة 5 ليالٍ لشخصين شامل الإفطار، السعر الإجمالي 7,500 ريال.");
    expect(r.facts.nights?.value).toBe(5);
    expect(r.facts.nights?.evidence).toContain("5 ليالٍ");
  });

  // Regression: a non-positive count is never presented as a confirmed fact.
  it("never emits a nights fact for a zero or negative count", () => {
    for (const text of ["إقامة 0 ليالٍ", "0 nights", "رحلة 00 ليلة", "-5 nights"]) {
      expect(nightsRule.apply(text).facts.nights).toBeUndefined();
    }
  });

  it("reads per-hotel nights that add up to the total as one stay, not rival counts", () => {
    const text = "7 ليالٍ – 8 أيام\nالإقامة الأولى | 4 ليالٍ\nالإقامة الثانية | 3 ليالٍ";
    const r = nightsRule.apply(text);
    expect(r.facts.nights?.value).toBe(7);
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 ليالٍ" }]);
  });

  it("still keeps counts that do not add up as separate values", () => {
    const r = nightsRule.apply("4 ليالٍ في الفندق الأول و3 ليالٍ في الثاني، المجموع 8 ليالٍ");
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([4, 3, 8]);
  });

  it("keeps counts that add up but are not marked as stays (alternative options)", () => {
    const r = nightsRule.apply("الباقة الذهبية 7 ليالٍ\nالباقة الفضية 4 ليالٍ\nالباقة البرونزية 3 ليالٍ");
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([7, 4, 3]);
  });

  it("reads a city split («4 ليالٍ في دبي و3 ليالٍ في أبوظبي») as one stay", () => {
    const r = nightsRule.apply("رحلة 7 ليالٍ: 4 ليالٍ في دبي و3 ليالٍ في أبوظبي");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 ليالٍ" }]);
  });

  it("reads stays listed before their total as one stay", () => {
    const r = nightsRule.apply("Stay 1: 4 nights\nStay 2: 3 nights\nTotal: 7 nights");
    expect(r.facts.nights?.value).toBe(7);
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("reads a total restated around its stays as one stay", () => {
    const r = nightsRule.apply("7 nights in Mauritius\nStay 1: 4 nights\nStay 2: 3 nights\nTotal: 7 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });
});
