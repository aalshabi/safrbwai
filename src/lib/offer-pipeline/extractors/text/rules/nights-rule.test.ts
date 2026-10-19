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
    const r = nightsRule.apply("Mauritius, 7 nights\nStay 1: 4 nights\nStay 2: 3 nights\nTotal: 7 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("never takes one of several stays as the total", () => {
    const r = nightsRule.apply("Stay 1: 4 nights\nStay 2: 3 nights\nStay 3: 1 night");
    expect(r.facts.nights).toBeUndefined();
    expect(r.observations).toBeUndefined();
  });

  it("keeps stays that do not add up to the stated total", () => {
    const r = nightsRule.apply("Total: 7 nights\nStay 1: 4 nights\nStay 2: 4 nights\nStay 3: 3 nights");
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([7, 4, 3]);
  });

  it("never takes a city stay as the total without total context", () => {
    const r = nightsRule.apply("4 nights in Dubai, 3 nights in Abu Dhabi, 1 night in Al Ain");
    expect(r.facts.nights).toBeUndefined();
    expect(r.observations).toBeUndefined();
  });

  it("never merges separate stays of the same length into one", () => {
    for (const text of [
      "Hotel A: 4 nights\nHotel B: 4 nights",
      "الإقامة الأولى | 4 ليالٍ\nالإقامة الثانية | 4 ليالٍ",
      "4 ليالٍ في دبي و4 ليالٍ في أبوظبي",
    ]) {
      const r = nightsRule.apply(text);
      expect(r.facts.nights).toBeUndefined();
      expect(r.observations).toBeUndefined();
    }
  });

  it("confirms the stated total over equal stays that add up to it", () => {
    const r = nightsRule.apply("Total: 8 nights\nHotel A: 4 nights\nHotel B: 4 nights");
    expect(r.facts.nights?.value).toBe(8);
    expect(r.observations?.nights).toEqual([{ value: 8, evidence: "8 nights" }]);
  });

  it("keeps equal stays beside a total they do not add up to", () => {
    const r = nightsRule.apply("Mauritius, 7 nights\nHotel A: 4 nights\nHotel B: 4 nights");
    expect(r.facts.nights?.value).toBe(7);
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([7, 4]);
  });

  it("takes the count that is not a stay as the length when stays come first", () => {
    const r = nightsRule.apply("4 nights in Dubai, 3 nights in Abu Dhabi. A trip of 8 nights.");
    expect(r.facts.nights?.value).toBe(8);
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([4, 3, 8]);
  });

  it("still confirms a single stay as the length", () => {
    expect(nightsRule.apply("Hotel A: 4 nights").facts.nights?.value).toBe(4);
  });

  it("adds two stays of the same length", () => {
    const r = nightsRule.apply("Total: 6 nights\nStay 1: 3 nights\nStay 2: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 6, evidence: "6 nights" }]);
  });

  it("keeps a stay as long as the total among the parts", () => {
    const r = nightsRule.apply("Total: 7 nights\nStay 1: 7 nights\nStay 2: 4 nights\nStay 3: 3 nights");
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([7, 4, 3]);
  });

  it("keeps a city stay as long as the total among the parts", () => {
    const r = nightsRule.apply("Total: 7 nights\n7 nights in Dubai\n4 nights in Abu Dhabi\n3 nights in Al Ain");
    expect(r.observations?.nights?.map((n) => n.value)).toEqual([7, 4, 3]);
  });

  it("reads each count in its own clause when they share a line", () => {
    const r = nightsRule.apply("Total: 7 nights; Stay 1: 4 nights; Stay 2: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("reads each count's own label across pipes", () => {
    const r = nightsRule.apply("Total: 7 nights | Hotel A: 4 nights | Hotel B: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("keeps the length when one stay is mentioned twice", () => {
    const r = nightsRule.apply("Hotel A: 4 nights\nHotel A stay: 4 nights");
    expect(r.facts.nights?.value).toBe(4);
  });

  it("still leaves the length unknown for two different stays of the same length", () => {
    for (const text of [
      "Hotel A: 4 nights\nHotel B: 4 nights",
      "4 nights in Dubai, 4 nights in Abu Dhabi",
      "الإقامة الأولى | 4 ليالٍ\nالإقامة الثانية | 4 ليالٍ",
    ]) {
      expect(nightsRule.apply(text).facts.nights, text).toBeUndefined();
    }
  });

  it("prefers a stated duration over a stay mentioned twice", () => {
    const r = nightsRule.apply("Hotel A: 4 nights\nHotel A stay: 4 nights\nDuration: 7 nights");
    expect(r.facts.nights?.value).toBe(7);
  });

  it("keeps the property type in a stay's name", () => {
    expect(nightsRule.apply("Hotel Marina: 4 nights\nMarina Resort: 4 nights").facts.nights).toBeUndefined();
    expect(nightsRule.apply("فندق النخيل: 4 ليالٍ\nالفندق النخيل: 4 ليالٍ").facts.nights?.value).toBe(4);
  });

  it("reads a place attached to «ب» as the stay's name", () => {
    expect(nightsRule.apply("4 ليالٍ بدبي\n4 ليالٍ بدبي").facts.nights?.value).toBe(4);
  });

  it("counts an inline stay repeated in one clause once", () => {
    expect(nightsRule.apply("4 nights in Dubai, 4 nights in Dubai").facts.nights?.value).toBe(4);
    expect(nightsRule.apply("Hotel A: 4 nights in Dubai\nHotel B: 4 nights in Dubai").facts.nights).toBeUndefined();
  });

  it("leaves a following total label to the next count", () => {
    const r = nightsRule.apply("4 nights in Dubai and 3 nights in Rome and Total: 7 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("reads nights written as words", () => {
    expect(nightsRule.apply("إقامة ليلة واحدة").facts.nights?.value).toBe(1);
    expect(nightsRule.apply("لمدة ليلتين").facts.nights?.value).toBe(2);
    expect(nightsRule.apply("one night in Rome").facts.nights?.value).toBe(1);
  });

  it("reads a city-by-city hotel list as one stay", () => {
    const text = [
      "- المدة: 9 ليالٍ / 10 أيام.",
      "- تبليسي، ليلة واحدة: Marjan Hotel 4★، شامل الإفطار.",
      "- جوداوري، ليلتان: Gudauri Inn 4★، شامل الإفطار.",
      "- باكورياني، ليلة واحدة: Crystal Hotel & Spa 4★، شامل الإفطار.",
      "- باتومي، 3 ليالٍ: New Wave Hotel 4★، شامل الإفطار.",
      "- تبليسي، ليلتان: Marjan Hotel 4★، شامل الإفطار.",
    ].join("\n");
    expect(nightsRule.apply(text).observations?.nights).toEqual([{ value: 9, evidence: "9 ليالٍ" }]);
  });

  it("counts each named stay once across the options of one offer", () => {
    const text = [
      "- المدة: 6 ليالٍ / 7 أيام.",
      "الخيار الأول",
      "- موسكو، 3 ليالٍ: DoubleTree Moscow 4★، شامل الإفطار.",
      "- سانت بطرسبرغ، 3 ليالٍ: Muse of City 4★، شامل الإفطار.",
      "الخيار الثاني",
      "- موسكو، 3 ليالٍ: Radisson Blu 5★، شامل الإفطار.",
      "- سانت بطرسبرغ، 3 ليالٍ: Cosmos 5★، شامل الإفطار.",
      "- الإقامة 6 ليالٍ مع الإفطار اليومي.",
    ].join("\n");
    expect(nightsRule.apply(text).observations?.nights).toEqual([{ value: 6, evidence: "6 ليالٍ" }]);
  });

  it("treats «6 ليالٍ في الفنادق المذكورة» as a restatement of the total", () => {
    const text = "المدة: 6 ليالٍ\n- كاندي، ليلتان: Royal Hotel\n- نواراليا، ليلتان: Fort Hotel\n- بنتوتة، ليلتان: Beach Hotel\n- 6 ليالٍ في الفنادق المذكورة أو ما يماثلها.";
    expect(nightsRule.apply(text).observations?.nights).toEqual([{ value: 6, evidence: "6 ليالٍ" }]);
  });

  it("gives a hotel to the later count on the same line, not to the total", () => {
    const r = nightsRule.apply("7 nights: Hotel A: 4 nights | Hotel B: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("a return to the same city is its own stay unless a later option repeats it", () => {
    const text = "Duration: 6 nights\n- Dubai, 3 nights: Hotel A\n- Abu Dhabi, 3 nights: Hotel B\n- Dubai, 3 nights: Hotel C";
    expect(nightsRule.apply(text).observations?.nights?.length).toBeGreaterThan(1);
  });

  it("checks each option's stays against the total on their own", () => {
    const text = "Duration: 3 nights\nOption 1\n- Hotel A: one night\n- Hotel B: two nights\nOption 2\n- Hotel C: one night\n- Hotel D: two nights";
    expect(nightsRule.apply(text).observations?.nights).toEqual([{ value: 3, evidence: "3 nights" }]);
  });

  it("generic hotel wording after the total does not make it a stay", () => {
    const r = nightsRule.apply("7 nights with hotel accommodation | Hotel A: 4 nights | Hotel B: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 nights" }]);
  });

  it("package breakfast after the total does not make it a stay", () => {
    const r = nightsRule.apply("7 ليالٍ شامل الإفطار\n- Hotel A: 4 nights\n- Hotel B: 3 nights");
    expect(r.observations?.nights).toEqual([{ value: 7, evidence: "7 ليالٍ" }]);
  });

  it("a cancellation deadline is not a stay length", () => {
    expect(nightsRule.apply("Duration: 7 nights. Cancel up to one night before arrival.").observations?.nights).toEqual([
      { value: 7, evidence: "7 nights" },
    ]);
    expect(nightsRule.apply("المدة 5 ليالٍ، الإلغاء مجاني حتى ليلتين قبل الوصول").observations?.nights).toEqual([
      { value: 5, evidence: "5 ليالٍ" },
    ]);
  });

  it("a cancellation penalty is not a stay length", () => {
    expect(nightsRule.apply("Duration: 7 nights. Late cancellation penalty: one night.").observations?.nights).toEqual([
      { value: 7, evidence: "7 nights" },
    ]);
    expect(nightsRule.apply("المدة 5 ليالٍ\nغرامة الإلغاء المتأخر: ليلة واحدة").observations?.nights).toEqual([
      { value: 5, evidence: "5 ليالٍ" },
    ]);
  });

  it("a Latin comma ends a cancellation clause", () => {
    expect(nightsRule.apply("Cancellation policy, duration: 7 nights").facts.nights?.value).toBe(7);
  });

  it("an Arabic deadline before the count is not a stay length", () => {
    expect(nightsRule.apply("المدة 7 ليالٍ\nيمكن التعديل قبل الوصول بليلة واحدة").observations?.nights).toEqual([
      { value: 7, evidence: "7 ليالٍ" },
    ]);
  });
});
