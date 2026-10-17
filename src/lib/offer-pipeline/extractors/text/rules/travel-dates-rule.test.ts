import { describe, expect, it } from "vitest";
import { travelDatesRule } from "./travel-dates-rule";

describe("travelDatesRule", () => {
  it.each([
    ["📅 من 8 إلى 15 نوفمبر 2026", "من 8 إلى 15 نوفمبر 2026"],
    ["السفر ٨ - ١٥ نوفمبر", "٨ - ١٥ نوفمبر"],
    ["من 28 أكتوبر إلى 3 نوفمبر", "من 28 أكتوبر إلى 3 نوفمبر"],
    ["Travel from 8 to 15 November 2026", "from 8 to 15 November 2026"],
    ["Dates: November 8 – 15, 2026", "November 8 – 15, 2026"],
    ["من 8/11/2026 إلى 15/11/2026", "من 8/11/2026 إلى 15/11/2026"],
  ])("reads the range in %s", (text, evidence) => {
    expect(travelDatesRule.apply(text).facts.travelDates).toEqual({
      value: evidence,
      evidence,
      confidenceType: "exact",
    });
  });

  it.each(["العرض ساري من 8 إلى 15 نوفمبر", "Offer valid from 8 to 15 November", "الحجز من 1 إلى 10 أكتوبر", "العرض ساري حتى 30 نوفمبر", "Book by 15 November", "7 ليالٍ – 8 أيام", "السعر 1,200 - 1,500 ريال"])(
    "does not take %s as travel dates",
    (text) => {
      expect(travelDatesRule.apply(text).facts.travelDates).toBeUndefined();
    }
  );

  it("takes the trip range, not an earlier per-hotel range", () => {
    const text = "الإقامة الأولى: 8 - 12 نوفمبر\nالإقامة الثانية: 12 - 15 نوفمبر\nتواريخ السفر: 8 - 15 نوفمبر";
    expect(travelDatesRule.apply(text).facts.travelDates?.value).toBe("8 - 15 نوفمبر");
  });

  it("confirms no trip dates when only per-hotel ranges are given", () => {
    const text = "Hotel 1: 8 - 12 November\nHotel 2: 12 - 15 November";
    expect(travelDatesRule.apply(text).facts.travelDates).toBeUndefined();
  });
});
