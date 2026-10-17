import { describe, it, expect } from "vitest";
import { flightRule } from "./flight-rule";
import { transfersRule } from "./transfers-rule";
import { taxesRule } from "./taxes-rule";
import { insuranceRule } from "./insurance-rule";
import { visaRule } from "./visa-rule";
import { runOfferPipeline } from "@/lib/offer-pipeline/pipeline";

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

// Typed or pasted text reaches the rules unrepaired, so the negator must also
// be recognised with a conjunction prefix («فلا»، «فغير») and when a list
// marker is glued to it with no space («-غير»، «1-غير»، «•لا»، «2)غير»).
describe("prefixed and glued negators", () => {
  const taxes = (text: string) => taxesRule.apply(text).facts.taxes?.value;
  const insurance = (text: string) => insuranceRule.apply(text).facts.insurance?.value;

  const forms = (phrase: string) => [
    `و${phrase}`,
    `ف${phrase}`,
    `-${phrase}`,
    `–${phrase}`,
    `•${phrase}`,
    `1-${phrase}`,
    `2)${phrase}`,
  ];

  it.each([...forms("لا يشمل الطيران"), ...forms("غير شامل الطيران"), "وليس شامل الطيران"])(
    "flight: %s → not included",
    (text) => {
      expect(flight(text)).toEqual({ included: false });
    }
  );

  it.each([...forms("لا يشمل الضرائب"), ...forms("غير شامل الضرائب")])(
    "taxes: %s → not included",
    (text) => {
      expect(taxes(text)).toEqual({ included: false });
    }
  );

  it.each(forms("غير شامل التأمين الصحي"))("insurance: %s → not included", (text) => {
    expect(insurance(text)).toBe(false);
  });

  // InsuranceRule has no «يشمل التأمين» pattern, so these stay unknown; the
  // guard is only that they never read as included.
  it.each(forms("لا يشمل التأمين"))("insurance: %s → never included", (text) => {
    expect(insurance(text)).not.toBe(true);
  });

  it("the evidence starts at the negator, not at the list marker", () => {
    const evidence = flightRule.apply("-غير شامل الطيران").facts.flight?.evidence;
    expect(evidence).toBe("غير شامل الطيران");
  });

  it.each([
    ["العرض لايت شامل الطيران", true],
    ["باقة لايف شامل الطيران", true],
    ["رحلة العلا شامل الطيران", true],
    // A boundary probe: «لا» glued to the letter «ب» is not the negator.
    ["رحلة بلا شامل الطيران", true],
  ] as const)("a negator inside a word is not a negation: %s → %s", (text, included) => {
    expect(flight(text)).toEqual({ included });
  });

  const base = "عرض إلى دبي 4 ليالٍ لشخصين، السعر الإجمالي 3200 ريال، شامل الإفطار.\n";
  const facts = async (line: string) => {
    const outcome = await runOfferPipeline({ type: "text", text: base + line });
    if (outcome.status !== "ok") throw new Error(`unexpected outcome: ${outcome.status}`);
    return outcome.extraction.facts;
  };

  it.each(["فلا يشمل الطيران", "ولا يشمل الطيران", "-غير شامل الطيران", "- غير شامل الطيران"])(
    "pipeline: %s → flight not included",
    async (line) => {
      expect((await facts(line)).flight?.value).toEqual({ included: false });
    }
  );

  it.each(["1-غير شامل التأمين الصحي", "فغير شامل التأمين"])(
    "pipeline: %s → insurance not included",
    async (line) => {
      expect((await facts(line)).insurance?.value).toBe(false);
    }
  );

  it.each(["فلا يشمل الضرائب", "-غير شامل الضرائب"])(
    "pipeline: %s → taxes not included",
    async (line) => {
      expect((await facts(line)).taxes?.value).toEqual({ included: false });
    }
  );
});
