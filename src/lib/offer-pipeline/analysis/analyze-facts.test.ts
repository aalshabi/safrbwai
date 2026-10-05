import { describe, it, expect } from "vitest";
import type { ExtractedOfferFacts, Fact } from "@/lib/offer-pipeline/types";
import { analyzeFacts } from "./analyze-facts";
import type { OfferObservations } from "./types";

function fact<T>(value: T, evidence: string): Fact<T> {
  return { value, evidence, confidenceType: "exact" };
}

const fullArabic: ExtractedOfferFacts = {
  totalPrice: fact({ amount: 3200, currency: "SAR" }, "٣٢٠٠ ر.س"),
  currency: fact("SAR", "ر.س"),
  nights: fact(5, "٥ ليالٍ"),
  destination: fact({ value: "دبي", canonicalValue: "Dubai", countryCode: "AE", matchType: "canonical_alias" as const }, "دبي"),
  travelers: fact({ adults: 2 }, "٢ بالغين"),
  board: fact("BB", "شامل الإفطار"),
};

describe("analyzeFacts", () => {
  // (1) a price/nights/board offer counts only what it actually states
  it("counts completeness over the full required set, not a narrow subset", () => {
    const a = analyzeFacts(fullArabic);
    expect(a.completeness.required).toBe(10);
    // totalPrice, currency, nights, destination, travellers, board are stated
    expect(a.completeness.present).toBe(6);
    // …but accommodation / transfers / taxes / cancellation are not
    const absent = a.completeness.fields.filter((f) => !f.present).map((f) => f.key);
    expect(absent).toEqual(["accommodation", "transfers", "taxes", "cancellationPolicy"]);
    expect(a.contradictions).toEqual([]);
  });

  // (2) offer missing the price
  it("marks a missing price as a required missing field (completeness 2/3)", () => {
    const a = analyzeFacts({ currency: fact("SAR", "ر.س"), nights: fact(5, "5 nights") });
    expect(a.completeness.present).toBe(2);
    const price = a.missingFields.find((m) => m.key === "totalPrice");
    expect(price?.requirement).toBe("required");
    expect(a.suggestedQuestions.some((q) => q.key === "totalPrice")).toBe(true);
  });

  // (3) offer missing the currency
  it("marks a missing currency as required missing", () => {
    const a = analyzeFacts({ nights: fact(5, "5 nights"), board: fact("BB", "breakfast") });
    expect(a.completeness.present).toBe(2); // nights + board
    expect(a.missingFields.find((m) => m.key === "currency")?.requirement).toBe("required");
    expect(a.suggestedQuestions.some((q) => q.key === "currency")).toBe(true);
  });

  // (4) offer missing the cancellation policy (recommended)
  it("surfaces a missing cancellation policy as recommended + a question", () => {
    const a = analyzeFacts(fullArabic);
    expect(a.missingFields.find((m) => m.key === "cancellationPolicy")?.requirement).toBe("required");
    expect(a.suggestedQuestions.some((q) => q.key === "cancellationPolicy")).toBe(true);
  });

  // (5) two different prices propagate to checklist + questions
  it("marks price conflicting on the checklist when prices differ", () => {
    const obs: OfferObservations = {
      prices: [
        { amount: 3200, currency: "SAR", basis: "total", evidence: "٣٢٠٠ ر.س" },
        { amount: 2800, currency: "SAR", basis: "total", evidence: "٢٨٠٠ ر.س" },
      ],
    };
    const a = analyzeFacts(fullArabic, { observations: obs });
    expect(a.checklist.find((c) => c.key === "totalPrice")?.status).toBe("conflicting");
    expect(a.suggestedQuestions.some((q) => q.key === "totalPrice")).toBe(true);
  });

  // Regression: completeness must not read "full" while core info is absent.
  it("never reports full completeness when destination/travellers/accommodation are missing", () => {
    const a = analyzeFacts({
      totalPrice: fact({ amount: 3200, currency: "SAR" }, "٣٢٠٠ ر.س"),
      currency: fact("SAR", "ر.س"),
      nights: fact(5, "٥ ليالٍ"),
    });
    // the old model reported 3/3 here — a misleading "complete" offer
    expect(a.completeness.present).not.toBe(a.completeness.required);
    expect(a.completeness.required).toBeGreaterThanOrEqual(10);
    for (const key of ["destination", "travellers", "accommodation"]) {
      expect(a.completeness.fields.find((f) => f.key === key)?.present).toBe(false);
      expect(a.missingFields.some((m) => m.key === key)).toBe(true);
    }
    // visa/insurance are deliberately NOT part of the ratio
    for (const key of ["visa", "insurance"]) {
      expect(a.completeness.fields.some((f) => f.key === key)).toBe(false);
    }
  });

  // (11) questions come ONLY from missing or conflicting items
  it("never asks about a present, non-conflicting field", () => {
    const a = analyzeFacts(fullArabic);
    // nights is present and consistent → no nights question
    expect(a.suggestedQuestions.some((q) => q.key === "nights")).toBe(false);
    // taxes is absent → a taxes question exists
    expect(a.suggestedQuestions.some((q) => q.key === "taxes")).toBe(true);
  });

  // (12) completeness is exactly present / required with the counted fields
  it("computes completeness precisely over required fields", () => {
    const a = analyzeFacts({ nights: fact(3, "3 nights") });
    expect(a.completeness.present).toBe(1);
    expect(a.completeness.required).toBe(10);
    expect(a.completeness.fields.filter((f) => f.present).map((f) => f.key)).toEqual(["nights"]);
  });

  // (13) no random score anywhere; deterministic
  it("produces no score field and is deterministic", () => {
    const a = analyzeFacts(fullArabic);
    expect("score" in a).toBe(false);
    expect(JSON.stringify(a)).not.toContain("score");
    expect(analyzeFacts(fullArabic)).toEqual(a);
  });

  // (14) never invents facts
  it("confirms only facts that are present", () => {
    const a = analyzeFacts({ nights: fact(4, "4 nights") });
    expect(a.confirmedFacts.map((c) => c.key)).toEqual(["nights"]);
  });

  // (15) preserves evidence exactly
  it("preserves evidence on confirmed facts and the checklist", () => {
    const a = analyzeFacts(fullArabic);
    expect(a.confirmedFacts.find((c) => c.key === "nights")?.evidence).toBe("٥ ليالٍ");
    expect(a.checklist.find((c) => c.key === "nights")?.evidence).toEqual(["٥ ليالٍ"]);
  });

  // (16) Arabic evidence flows through
  it("works with Arabic evidence and bilingual labels", () => {
    const a = analyzeFacts(fullArabic);
    const price = a.confirmedFacts.find((c) => c.key === "totalPrice");
    expect(price?.evidence).toBe("٣٢٠٠ ر.س");
    expect(price?.label.ar).toBe("إجمالي الرحلة");
    expect(price?.confidenceType).toBe("exact");
  });

  // (17) English evidence flows through
  it("works with English evidence", () => {
    const a = analyzeFacts({
      totalPrice: fact({ amount: 3200, currency: "SAR" }, "SAR 3,200"),
      nights: fact(5, "5 nights"),
    });
    expect(a.confirmedFacts.find((c) => c.key === "totalPrice")?.evidence).toBe("SAR 3,200");
    expect(a.confirmedFacts.find((c) => c.key === "nights")?.label.en).toBe("Number of nights");
  });
});
