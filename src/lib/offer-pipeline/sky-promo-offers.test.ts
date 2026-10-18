import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runOfferPipeline } from "./pipeline";

/**
 * Ten promotional packages as an agency publishes them: grouped amounts with
 * halalas ("6,617.60"), per-city stays with word counts («ليلة واحدة»,
 * «ليلتان»), «الخدمات المشمولة» / «غير مشمول» lists and no flights. Public
 * promo copy: no client name, phone or booking number.
 */
const OFFERS = readFileSync(join(__dirname, "__fixtures__", "sky-promo-offers.md"), "utf8")
  .split(/\n(?=## العرض )/)
  .filter((chunk) => chunk.startsWith("## العرض "));

async function analyze(n: number) {
  const outcome = await runOfferPipeline({ type: "text", text: OFFERS[n - 1] });
  if (outcome.status !== "ok") throw new Error(outcome.status);
  return outcome;
}

const EXPECTED = [
  { n: 1, total: 6204, nights: 9, destination: "Tbilisi" },
  { n: 2, total: 6617.6, nights: 9, destination: "Tbilisi" },
  { n: 3, total: 5280, nights: 6, destination: "Baku" },
  { n: 4, total: 3520, nights: 5, destination: "Phuket" },
  { n: 5, total: 8140, nights: 9, destination: "Bangkok" },
  { n: 6, total: undefined, nights: 6, destination: "Saint Petersburg" },
  { n: 7, total: 10255.3, nights: 3, destination: "Maldives" },
  { n: 8, total: 3666.3, nights: 6, destination: "Kandy" },
  { n: 9, total: 2425.5, nights: 6, destination: "Kerala" },
  { n: 10, total: 4398.9, nights: 6, destination: "Tashkent" },
] as const;

describe("agency promo packages", () => {
  it("splits the fixture into ten offers", () => {
    expect(OFFERS).toHaveLength(10);
  });

  it.each(EXPECTED)("offer $n: total, nights and destination", async ({ n, total, nights, destination }) => {
    const { extraction, analysis } = await analyze(n);
    const facts = extraction.facts;
    if (total === undefined) expect(facts.totalPrice).toBeUndefined();
    else expect(facts.totalPrice?.value).toEqual({ amount: total, currency: "SAR" });
    expect(facts.nights?.value).toBe(nights);
    expect(facts.destination?.value.canonicalValue).toBe(destination);
    expect(analysis.contradictions).toEqual([]);
  });

  it("never reads «المدينة» (the city) as Madinah", async () => {
    for (let n = 1; n <= OFFERS.length; n++) {
      const { extraction } = await analyze(n);
      expect(extraction.facts.destination?.value.canonicalValue, `offer ${n}`).not.toBe("Madinah");
    }
  });

  it("asks no baggage question on packages without an included flight", async () => {
    for (let n = 1; n <= OFFERS.length; n++) {
      const { analysis } = await analyze(n);
      expect(analysis.suggestedQuestions.map((q) => q.key), `offer ${n}`).not.toContain("baggage");
    }
  });

  it("reads «لا يشمل الطيران الدولي» and a «غير مشمول» list as flights excluded", async () => {
    for (const n of [3, 6, 8, 9]) {
      const { extraction } = await analyze(n);
      expect(extraction.facts.flight?.value, `offer ${n}`).toEqual({ included: false });
    }
  });

  it("offer 6: the first tier price is a stated price, not a party total", async () => {
    const { extraction } = await analyze(6);
    expect(extraction.facts.statedPrice?.value).toEqual({ amount: 7326, currency: "SAR" });
    expect(extraction.facts.travelers?.value).toEqual({ adults: 2 });
  });

  it("offer 7: the HB → FB upgrade is full board, seaplane transfer and taxes included", async () => {
    const { extraction } = await analyze(7);
    expect(extraction.facts.board?.value).toBe("FB");
    expect(extraction.facts.transfer?.value).toEqual({ included: true });
    expect(extraction.facts.taxes?.value).toEqual({ included: true });
  });

  it("offer 8: airport meet-and-assist and taxes listed as included; insurance excluded", async () => {
    const { extraction } = await analyze(8);
    expect(extraction.facts.transfer?.value).toEqual({ included: true });
    expect(extraction.facts.taxes?.value).toEqual({ included: true });
    expect(extraction.facts.insurance?.value).toBe(false);
  });

  it("offer 3: «إفطار بوفيه مفتوح» is bed and breakfast", async () => {
    const { extraction } = await analyze(3);
    expect(extraction.facts.board?.value).toBe("BB");
  });
});
