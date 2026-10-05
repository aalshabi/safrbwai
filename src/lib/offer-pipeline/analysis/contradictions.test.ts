import { describe, it, expect } from "vitest";
import type { ExtractedOfferFacts, Fact } from "@/lib/offer-pipeline/types";
import { detectContradictions } from "./contradictions";
import type { OfferObservations } from "./types";

function fact<T>(value: T, evidence: string): Fact<T> {
  return { value, evidence, confidenceType: "exact" };
}

describe("detectContradictions", () => {
  it("finds nothing when a single facts object is internally consistent", () => {
    const facts: ExtractedOfferFacts = {
      price: fact({ amount: 3200, currency: "SAR" }, "٣٢٠٠ ر.س"),
      currency: fact("SAR", "ر.س"),
      nights: fact(5, "5 nights"),
    };
    expect(detectContradictions(facts)).toEqual([]);
  });

  // (5) two different prices → critical
  it("flags multiple different final prices as critical", () => {
    const obs: OfferObservations = {
      prices: [
        { amount: 3200, currency: "SAR", basis: "total", evidence: "٣٢٠٠ ر.س" },
        { amount: 2800, currency: "SAR", basis: "total", evidence: "٢٨٠٠ ر.س" },
      ],
    };
    const c = detectContradictions({}, obs);
    expect(c).toHaveLength(1);
    expect(c[0].code).toBe("multiple_prices");
    expect(c[0].severity).toBe("critical");
    expect(c[0].evidence).toEqual(["٣٢٠٠ ر.س", "٢٨٠٠ ر.س"]);
  });

  it("treats a same-currency unqualified offer price as a rival to an explicit total", () => {
    const c = detectContradictions(
      {},
      {
        prices: [
          { amount: 5000, currency: "SAR", basis: "total", evidence: "total SAR 5000" },
          { amount: 6000, currency: "SAR", basis: "unspecified", evidence: "price SAR 6000" },
        ],
      }
    );
    expect(c.map((item) => item.code)).toEqual(["multiple_prices"]);
  });

  it("keeps total, per-person, and per-night prices separate", () => {
    const c = detectContradictions(
      { travelers: fact({ adults: 2 }, "2 adults") },
      {
        prices: [
          { amount: 2400, currency: "SAR", basis: "total", evidence: "total SAR 2400" },
          { amount: 1200, currency: "SAR", basis: "per_person", evidence: "SAR 1200 per person" },
          { amount: 480, currency: "SAR", basis: "per_night", evidence: "SAR 480 per night" },
        ],
      }
    );
    expect(c).toEqual([]);
  });

  it("detects a provable total arithmetic mismatch without inventing a total", () => {
    const mismatch = detectContradictions(
      { travelers: fact({ adults: 2 }, "2 adults") },
      {
        prices: [
          { amount: 2000, currency: "SAR", basis: "total", evidence: "total SAR 2000" },
          { amount: 1200, currency: "SAR", basis: "per_person", evidence: "SAR 1200 per person" },
        ],
      }
    );
    expect(mismatch.map((item) => item.code)).toEqual(["price_total_mismatch"]);

    const noTotal = detectContradictions(
      { travelers: fact({ adults: 2 }, "2 adults") },
      {
        prices: [
          { amount: 1200, currency: "SAR", basis: "per_person", evidence: "SAR 1200 per person" },
        ],
      }
    );
    expect(noTotal).toEqual([]);
  });

  it("flags conflicting currency from facts alone (price vs currency)", () => {
    const facts: ExtractedOfferFacts = {
      price: fact({ amount: 3200, currency: "SAR" }, "3200 SAR"),
      currency: fact("USD", "USD"),
    };
    const c = detectContradictions(facts);
    expect(c.map((x) => x.code)).toContain("conflicting_currency");
    expect(c.find((x) => x.code === "conflicting_currency")?.severity).toBe("warning");
  });

  // (6) two conflicting board types
  it("flags conflicting board types", () => {
    const c = detectContradictions(
      {},
      { boards: [{ value: "BB", evidence: "شامل الإفطار" }, { value: "FB", evidence: "إقامة كاملة" }] }
    );
    expect(c.map((x) => x.code)).toEqual(["conflicting_board"]);
  });

  // (7) baggage included AND excluded (two conflicting values)
  it("flags conflicting baggage", () => {
    const c = detectContradictions(
      {},
      { baggage: [{ value: "20kg", evidence: "٢٠ كجم" }, { value: "none", evidence: "بدون أمتعة" }] }
    );
    expect(c.map((x) => x.code)).toEqual(["conflicting_baggage"]);
  });

  // (8)(9)(10) boolean inclusions asserted both true and false
  it("flags insurance / visa / transfers stated included and excluded", () => {
    const insurance = detectContradictions(
      {},
      { insurance: [{ value: true, evidence: "شامل التأمين" }, { value: false, evidence: "التأمين غير مشمول" }] }
    );
    expect(insurance.map((x) => x.code)).toEqual(["conflicting_insurance"]);

    const visa = detectContradictions(
      {},
      { visa: [{ value: true, evidence: "visa included" }, { value: false, evidence: "visa not included" }] }
    );
    expect(visa.map((x) => x.code)).toEqual(["conflicting_visa"]);

    const transfers = detectContradictions(
      {},
      { transfers: [{ value: true, evidence: "transfer included" }, { value: false, evidence: "no transfer" }] }
    );
    expect(transfers.map((x) => x.code)).toEqual(["conflicting_transfers"]);
  });

  // (6) differing night counts
  it("flags conflicting night counts", () => {
    const c = detectContradictions(
      {},
      { nights: [{ value: 5, evidence: "5 ليالٍ" }, { value: 7, evidence: "7 nights" }] }
    );
    expect(c.map((x) => x.code)).toEqual(["conflicting_nights"]);
  });
});
