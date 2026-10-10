import { describe, it, expect } from "vitest";
import { flightRule } from "./flight-rule";
import { transfersRule } from "./transfers-rule";
import { taxesRule } from "./taxes-rule";
import { insuranceRule } from "./insurance-rule";
import { visaRule } from "./visa-rule";

// A negation must never surface as "included": that would tell the traveller
// the price covers something it does not.

const flight = (text: string) => flightRule.apply(text).facts.flight?.value;
const transfer = (text: string) => transfersRule.apply(text).facts.transfer?.value;

describe("negation before the inclusion word", () => {
  it.each([
    "السعر لا يشمل تذاكر الطيران",
    "لا يشمل الطيران",
    "غير شامل الطيران",
    "العرض غير شاملة الطيران",
    "ليس شامل الطيران",
    "Price does not include flights",
    "The package doesn't include airfare",
    "No flights included",
  ])("flight: %s → not included", (text) => {
    expect(flight(text)).toEqual({ included: false });
  });

  it.each([
    "لا يشمل التنقلات",
    "غير شامل النقل",
    "السعر لا يشمل المواصلات",
    "Price does not include transfers",
    "Package doesn't include airport transfers",
  ])("transfer: %s → not included", (text) => {
    expect(transfer(text)).toEqual({ included: false });
  });

  it("taxes, insurance and visa share the same guard", () => {
    expect(taxesRule.apply("السعر لا يشمل الضرائب").facts.taxes?.value).toEqual({ included: false });
    expect(insuranceRule.apply("غير شامل التأمين").facts.insurance?.value).toBe(false);
    expect(visaRule.apply("غير شامل التأشيرة").facts.visa?.value).toBe(false);
  });

  it("the evidence quotes the negation, not just the affirmative part", () => {
    const evidence = flightRule.apply("السعر لا يشمل تذاكر الطيران").facts.flight?.evidence ?? "";
    expect(evidence).toContain("لا");
  });
});

describe("negation after the inclusion phrase", () => {
  it.each([
    "Return tickets not included",
    "Round-trip tickets are not included",
  ])("flight: %s → not included", (text) => {
    expect(flight(text)).toEqual({ included: false });
  });

  it("transfer: «خدمة الاستقبال والنقل غير متوفرة» → not included", () => {
    expect(transfer("خدمة الاستقبال والنقل غير متوفرة")).toEqual({ included: false });
  });

  it("a negation later in the same clause makes the fact unknown, never included", () => {
    const result = transfersRule.apply("النقل من وإلى المطار والفندق والجولات غير مشمول");
    expect(result.facts.transfer?.value).not.toEqual({ included: true });
  });
});

describe("domestic flights do not answer whether the trip's flight is included", () => {
  it.each([
    "يشمل الطيران الداخلي بين كوالالمبور ولنكاوي",
    "شامل الطيران الداخلي",
    "Includes domestic flights between the islands",
    "Domestic flights included",
  ])("%s → no flight fact", (text) => {
    expect(flight(text)).toBeUndefined();
  });

  it("still warns that the flight's inclusion was not stated", () => {
    expect(flightRule.apply("يشمل الطيران الداخلي").warnings).toHaveLength(1);
  });
});

describe("affirmative statements are unchanged", () => {
  it.each([
    ["شامل الطيران والفندق", true],
    ["يشمل تذاكر الطيران", true],
    ["الطيران مشمول في السعر", true],
    ["Includes return flights", true],
    ["International flights are included", true],
    ["تذاكر الطيران غير مشمولة", false],
    ["بدون طيران", false],
  ] as const)("flight: %s → %s", (text, included) => {
    expect(flight(text)).toEqual({ included });
  });

  it.each([
    ["استقبال وتوديع من وإلى المطار", true],
    ["شامل التنقلات", true],
    ["Private airport transfers included", true],
    ["Transfers not included", false],
  ] as const)("transfer: %s → %s", (text, included) => {
    expect(transfer(text)).toEqual({ included });
  });

  it("a negation in an earlier clause does not flip a later affirmative", () => {
    expect(flight("لا توجد رسوم خفية. يشمل الطيران")).toEqual({ included: true });
    expect(flight("No hidden fees, includes flights")).toEqual({ included: true });
  });
});
