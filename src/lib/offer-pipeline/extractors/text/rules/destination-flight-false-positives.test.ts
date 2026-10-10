import { describe, it, expect } from "vitest";
import { destinationRule } from "./destination-rule";
import { flightRule } from "./flight-rule";
import { transfersRule } from "./transfers-rule";

// Synthetic offer wording only. Each case guards against stating a destination
// or a flight inclusion the text does not support.

const dest = (text: string) => destinationRule.apply(text).facts.destination?.value;
const destEvidence = (text: string) => destinationRule.apply(text).facts.destination?.evidence;
const flight = (text: string) => flightRule.apply(text).facts.flight?.value;
const transfer = (text: string) => transfersRule.apply(text).facts.transfer?.value;

describe("1. an origin-only city is never the destination", () => {
  it.each([
    "المغادرة من الرياض لمدة 5 ليالٍ",
    "رحلة من جدة، فندق ٥ نجوم",
    "الانطلاق من الرياض. 5 ليالٍ شامل الإفطار",
    "Departing from Riyadh, 5 nights with breakfast",
  ])("%s → no destination", (text) => {
    expect(dest(text)).toBeUndefined();
  });

  it.each([
    ["من الرياض إلى تبليسي ٦ ليالٍ", "Tbilisi"],
    ["المغادرة من الرياض، الوجهة: تبليسي", "Tbilisi"],
    ["From Riyadh to Tbilisi for 6 nights", "Tbilisi"],
    ["من جدة إلى تركيا ٧ ليالٍ", "Turkey"],
  ] as const)("%s → %s", (text, canonical) => {
    expect(dest(text)).toMatchObject({ canonicalValue: canonical });
  });

  it("a word that merely ends in «من» is not an origin marker", () => {
    // «يتضمن» ends with «من»; the city after it must stay a candidate.
    expect(dest("البرنامج يتضمن اسطنبول وبورصة")).toMatchObject({ canonicalValue: "Istanbul" });
  });
});

describe("2. an English alias must be a whole word", () => {
  it.each([
    "Female traveler, 5 nights, total SAR 4000",
    "Females only group tour",
  ])("%s → no destination", (text) => {
    expect(dest(text)).toBeUndefined();
  });

  it("«Male» as a word about people is not a destination", () => {
    expect(dest("Male travelers only, 5 nights")).toBeUndefined();
  });

  it.each([
    "Trip to Male for 5 nights",
    "Destination: Male",
    "5 nights in Malé, total USD 3000",
    "Maldives water villa, 4 nights",
  ])("%s → Malé", (text) => {
    expect(dest(text)).toMatchObject({ canonicalValue: "Malé", countryCode: "MV" });
  });

  it("the evidence is the alias as written", () => {
    expect(destEvidence("Trip to Male for 5 nights")).toBe("Male");
  });

  it("Arabic prefixes attached to a city still match", () => {
    expect(dest("أسبوع بدبي شامل الإفطار")).toMatchObject({ canonicalValue: "Dubai" });
  });
});

describe("3. «المغرب» as a prayer time is not Morocco", () => {
  it.each([
    "العودة بعد صلاة المغرب. فندق ٤ نجوم",
    "موعدنا وقت المغرب في بهو الفندق",
    "التجمع قبل المغرب، والانطلاق بعد العشاء",
  ])("%s → no destination", (text) => {
    expect(dest(text)).toBeUndefined();
  });

  it.each([
    "رحلة إلى المغرب لمدة 7 ليالٍ",
    "الوجهة: المغرب",
    "Trip to Morocco for 7 nights",
    "Morocco tour, 7 nights",
  ])("%s → Morocco", (text) => {
    expect(dest(text)).toMatchObject({ canonicalValue: "Morocco", countryCode: "MA" });
  });

  it("a stated city still wins over the prayer-time word", () => {
    expect(dest("رحلة إلى مراكش، العودة بعد صلاة المغرب")).toMatchObject({ canonicalValue: "Marrakesh" });
  });
});

describe("4. an airline name is not a flight inclusion", () => {
  it.each([
    "مع طيران ناس",
    "السفر مع طيران ناس، 5 ليالٍ في دبي",
    "رحلات مع طيران أديل",
    "السفر مع الطيران العماني",
  ])("%s → flight inclusion unknown", (text) => {
    expect(flight(text)).toBeUndefined();
    expect(flightRule.apply(text).warnings).toHaveLength(1);
  });

  it.each([
    ["يشمل تذاكر طيران ناس ذهابًا وعودة", true],
    ["شامل الطيران مع طيران ناس", true],
    ["مع الطيران", true],
    ["تذاكر طيران ذهاب وعودة على طيران ناس", true],
    ["السعر لا يشمل تذاكر الطيران", false],
    ["غير شامل الطيران، السفر مع طيران ناس", false],
  ] as const)("%s → included: %s", (text, included) => {
    expect(flight(text)).toEqual({ included });
  });

  it("negated transfers from PR #46 stay excluded", () => {
    expect(transfer("لا يشمل التنقلات")).toEqual({ included: false });
    expect(transfer("Price does not include transfers")).toEqual({ included: false });
  });
});
