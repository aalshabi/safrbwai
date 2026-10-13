import { describe, expect, it } from "vitest";
import { runOfferPipeline } from "./pipeline";

/**
 * A total qualified by its party size — «السعر الإجمالي للشخصين», "total for
 * two" — is still the trip total. Synthetic inputs only.
 */
const MAURITIUS_MISMATCH =
  "عرض موريشيوس: 6 ليالٍ في فندق 5 نجوم على البحر، إفطار وعشاء، استقبال وتوديع من المطار. السعر 9800 ريال للشخص في غرفة مزدوجة. السعر الإجمالي للشخصين 18500 ريال. الطيران غير مشمول.";
const MAURITIUS_MATCH = MAURITIUS_MISMATCH.replace("18500", "19600");

async function analyze(text: string) {
  const outcome = await runOfferPipeline({ type: "text", text });
  expect(outcome.status).toBe("ok");
  if (outcome.status !== "ok") throw new Error("pipeline did not analyze the text");
  return outcome;
}

describe("party-qualified totals", () => {
  it("extracts «السعر الإجمالي للشخصين» as the total and flags the arithmetic mismatch", async () => {
    const { extraction, analysis } = await analyze(MAURITIUS_MISMATCH);

    expect(extraction.facts.perPersonPrice?.value).toEqual({ amount: 9800, currency: "SAR" });
    expect(extraction.facts.totalPrice?.value).toEqual({ amount: 18500, currency: "SAR" });
    expect(extraction.facts.totalPrice?.evidence).toBe("18500 ريال");
    expect(extraction.facts.travelers?.value).toEqual({ adults: 2 });

    expect(analysis.checklist.find((item) => item.key === "totalPrice")?.status).toBe("conflicting");
    const mismatch = analysis.contradictions.filter(
      (contradiction) => contradiction.code === "price_total_mismatch"
    );
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].severity).toBe("critical");
    expect(mismatch[0].evidence).toEqual(["18500 ريال", "9800 ريال للشخص", "شخصين"]);
    expect(analysis.contradictions.map((contradiction) => contradiction.code)).toEqual([
      "price_total_mismatch",
    ]);
  });

  it("confirms a matching party total without a contradiction", async () => {
    const { extraction, analysis } = await analyze(MAURITIUS_MATCH);

    expect(extraction.facts.totalPrice?.value).toEqual({ amount: 19600, currency: "SAR" });
    expect(extraction.facts.perPersonPrice?.value).toEqual({ amount: 9800, currency: "SAR" });
    expect(analysis.checklist.find((item) => item.key === "totalPrice")?.status).toBe("present");
    expect(analysis.contradictions).toEqual([]);
    expect(analysis.missingFields.map((field) => field.key)).not.toContain("totalPrice");
  });

  it("handles the English “total for two” phrasing", async () => {
    const mismatch = await analyze(
      "Mauritius offer: 6 nights, half board. Price SAR 9,800 per person in a double room. Total price for two people SAR 18,500. Flights not included."
    );
    expect(mismatch.extraction.facts.totalPrice?.value).toEqual({ amount: 18500, currency: "SAR" });
    // The head count comes from the total's own party phrase; no traveller
    // fact is invented from it.
    expect(mismatch.extraction.facts.travelers).toBeUndefined();
    expect(mismatch.analysis.contradictions).toEqual([
      expect.objectContaining({
        code: "price_total_mismatch",
        severity: "critical",
        evidence: ["SAR 18,500", "SAR 9,800 per person", "for two people"],
      }),
    ]);

    const match = await analyze(
      "Mauritius offer: 6 nights, half board. Price SAR 9,800 per person in a double room. Total for 2 adults: SAR 19,600. Flights not included."
    );
    expect(match.extraction.facts.totalPrice?.value).toEqual({ amount: 19600, currency: "SAR" });
    expect(match.analysis.contradictions).toEqual([]);
  });

  it("does not read a «للشخصين» amount as a per-person rate", async () => {
    const { extraction, analysis } = await analyze(
      "عرض إلى دبي لمدة 4 ليالٍ، السعر 2,000 ريال للشخص، والإجمالي 3,800 ريال للشخصين."
    );
    expect(extraction.facts.perPersonPrice?.value).toEqual({ amount: 2000, currency: "SAR" });
    expect(extraction.facts.totalPrice?.value).toEqual({ amount: 3800, currency: "SAR" });
    expect(analysis.contradictions.map((contradiction) => contradiction.code)).toEqual([
      "price_total_mismatch",
    ]);
  });

  it("does not compare a party total against a different stated traveller count", async () => {
    const { extraction, analysis } = await analyze(
      "عرض لـ 4 بالغين، السعر 9800 ريال للشخص، والسعر الإجمالي للشخصين 18500 ريال."
    );
    expect(extraction.facts.travelers?.value).toEqual({ adults: 4 });
    expect(extraction.facts.perPersonPrice?.value).toEqual({ amount: 9800, currency: "SAR" });
    expect(analysis.contradictions.map((contradiction) => contradiction.code)).not.toContain(
      "price_total_mismatch"
    );
  });

  it("does not raise a mismatch from non-party or unit-rate phrasings", async () => {
    for (const text of [
      "Price per person SAR 1,500. Total SAR 4,000 for two weeks.",
      "Price per person SAR 2,000. Total for both: SAR 13,000.",
      "Flights SAR 2,000 and hotel SAR 3,000 per person; price for both: SAR 5,000.",
      "4 ليالٍ. السعر 2,500 ريال للشخص. السعر 1,200 ريال للشخصين في الليلة.",
      "5 nights. Price per person SAR 3,000. Price for two people SAR 1,200/night.",
      "Price per person SAR 6,000. Total SAR 20,000 for two adults and one child.",
      "السعر 6000 ريال للشخص. الإجمالي 15000 ريال للشخصين مع طفل.",
    ]) {
      const { analysis } = await analyze(text);
      expect(
        analysis.contradictions.map((contradiction) => contradiction.code),
        text
      ).not.toContain("price_total_mismatch");
    }
  });

  it("still compares a mixed-group total against a traveller count that includes children", async () => {
    const { analysis } = await analyze(
      "Price SAR 5,000 per person. Total SAR 30,000 for 2 adults and 2 children."
    );
    expect(analysis.contradictions.map((contradiction) => contradiction.code)).toEqual([
      "price_total_mismatch",
    ]);
  });

  it("treats totals for different party sizes as tiers, not rival prices", async () => {
    for (const text of [
      "Total for 2 people: SAR 18,500. Total for 3 people: SAR 26,000.",
      "السعر للشخصين 18500 ريال، والسعر لـ 3 أشخاص 26000 ريال.",
      "السعر الإجمالي للشخصين 18500 ريال، والسعر الإجمالي لـ 3 أشخاص 26000 ريال.",
    ]) {
      const { analysis } = await analyze(text);
      expect(analysis.contradictions, text).toEqual([]);
    }
    const { analysis } = await analyze(
      "Total for 2 people: SAR 18,500. Total for 2 people: SAR 19,000. Total for 3 people: SAR 26,000."
    );
    expect(analysis.contradictions).toEqual([
      expect.objectContaining({
        code: "multiple_prices",
        evidence: ["SAR 18,500", "SAR 19,000"],
      }),
    ]);
  });

  it("never synthesizes a total from the per-person price", async () => {
    const { extraction, analysis } = await analyze(
      "عرض موريشيوس لشخصين: 6 ليالٍ. السعر 9800 ريال للشخص في غرفة مزدوجة."
    );
    expect(extraction.facts.totalPrice).toBeUndefined();
    expect(analysis.contradictions).toEqual([]);
  });
});
