import { describe, it, expect } from "vitest";
import type { ExtractedOfferFacts, Fact } from "@/lib/offer-pipeline/types";
import { analyzeFacts } from "./analyze-facts";
import type { OfferObservations } from "./types";

function fact<T>(value: T, evidence: string): Fact<T> {
  return { value, evidence, confidenceType: "exact" };
}

/** A minimal core so tests can focus on the CONTEXTUAL question logic. */
const core: ExtractedOfferFacts = {
  totalPrice: fact({ amount: 3200, currency: "SAR" }, "٣٢٠٠ ر.س"),
  currency: fact("SAR", "ر.س"),
  nights: fact(5, "٥ ليالٍ"),
};

/**
 * A well-specified offer: every HIGH-priority field is already stated, so the
 * medium/low contextual questions are the ones that can surface.
 */
const rich: ExtractedOfferFacts = {
  ...core,
  destination: fact({ value: "دبي", canonicalValue: "Dubai", countryCode: "AE", matchType: "canonical_alias" as const }, "دبي"),
  travelers: fact({ adults: 2 }, "شخصين"),
  accommodation: fact("فندق 5 نجوم", "فندق 5 نجوم"),
  board: fact("BB", "شامل الإفطار"),
  baggage: fact("23kg", "٢٣ كجم"),
  transfer: fact({ included: true }, "استقبال وتوصيل"),
  taxes: fact({ included: true }, "شامل الضرائب"),
  cancellationPolicy: fact("إلغاء مجاني", "إلغاء مجاني"),
};

const RICH_TEXT = "عرض إلى دبي 5 ليالٍ لشخصين في فندق 5 نجوم غرفة مزدوجة، شامل الإفطار وشامل الضرائب، إلغاء مجاني، استقبال وتوصيل خاص، الأمتعة 23 كجم";

const WEIGHT = { high: 0, medium: 1, low: 2 } as const;

describe("suggestedQuestions — merging, cap, priority and context", () => {
  // (1) never more than 5, even when missing + conflicting + contextual all fire
  it("caps at 5 after merging missing, conflicting and contextual sources", () => {
    const obs: OfferObservations = {
      prices: [
        { amount: 3200, currency: "SAR", basis: "total", evidence: "٣٢٠٠ ر.س" },
        { amount: 2800, currency: "SAR", basis: "total", evidence: "٢٨٠٠ ر.س" },
      ],
      nights: [
        { value: 5, evidence: "٥ ليالٍ" },
        { value: 7, evidence: "٧ ليالٍ" },
      ],
      boards: [
        { value: "BB", evidence: "إفطار" },
        { value: "FB", evidence: "كامل" },
      ],
    };
    // an almost-empty offer (max missing) + conflicts + rich context
    const a = analyzeFacts(
      { totalPrice: core.totalPrice, nights: core.nights, board: fact("BB", "إفطار") },
      { text: "رحلة طيران وفندق إلى مدينتين مع طفلين، التأشيرة والتأمين غير مشمولين", observations: obs }
    );
    expect(a.suggestedQuestions.length).toBeLessThanOrEqual(5);
    expect(a.contradictions.length).toBeGreaterThan(0); // conflicts really existed
  });

  // (8) no duplicate questions
  it("emits no duplicate question keys", () => {
    const a = analyzeFacts(core, { text: "رحلة طيران وإقامة فندقية مع مواصلات إلى مدينتين" });
    const keys = a.suggestedQuestions.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // (2) visa never appears without an explicit textual mention
  it("does NOT ask about the visa when the text never mentions it", () => {
    for (const text of [RICH_TEXT, "عرض داخلي إلى جدة 3 ليالٍ شامل الإفطار", undefined]) {
      const a = analyzeFacts(rich, { text });
      expect(a.suggestedQuestions.some((q) => q.key === "visa")).toBe(false);
    }
  });

  // (3) insurance never appears without an explicit textual mention
  it("does NOT ask about insurance when the text never mentions it", () => {
    for (const text of [RICH_TEXT, "عرض داخلي إلى جدة 3 ليالٍ شامل الإفطار", undefined]) {
      const a = analyzeFacts(rich, { text });
      expect(a.suggestedQuestions.some((q) => q.key === "insurance")).toBe(false);
    }
  });

  // visa/insurance DO appear once the offer itself raises them
  it("asks about visa and insurance only when the text mentions them", () => {
    const a = analyzeFacts(rich, { text: `${RICH_TEXT}، التأشيرة غير مشمولة والتأمين غير مشمول` });
    expect(a.suggestedQuestions.some((q) => q.key === "visa")).toBe(true);
    expect(a.suggestedQuestions.some((q) => q.key === "insurance")).toBe(true);
  });

  // (7) transfers / taxes / room rank above visa and insurance
  it("ranks transfers, taxes and room type ahead of visa and insurance", () => {
    // an offer missing the high-priority info that ALSO mentions visa+insurance
    const a = analyzeFacts(core, {
      text: "رحلة طيران وإقامة في فندق، التأشيرة غير مشمولة والتأمين غير مشمول",
    });
    const keys = a.suggestedQuestions.map((q) => q.key);
    expect(keys).toContain("taxes");
    expect(keys).toContain("transfers");
    expect(keys).toContain("roomType");
    // the low-priority pair is crowded out entirely by the high-priority five
    expect(keys).not.toContain("visa");
    expect(keys).not.toContain("insurance");
  });

  // ordering invariant: high → medium → low
  it("orders questions high → medium → low", () => {
    const a = analyzeFacts(core, { text: "رحلة طيران وإقامة فندقية مع طفلين إلى مدينتين" });
    const weights = a.suggestedQuestions.map((q) => WEIGHT[q.priority]);
    expect(weights).toEqual([...weights].sort((x, y) => x - y));
  });

  // contextual transfer questions
  it("asks about airport transfers when a flight+hotel bundle omits transport", () => {
    const a = analyzeFacts(
      { ...core, board: fact("BB", "شامل الإفطار") },
      { text: "رحلة طيران وإقامة فندقية ٥ ليالٍ في دبي" }
    );
    expect(a.suggestedQuestions.some((q) => q.question.ar === "هل الاستقبال والتوصيل من وإلى المطار مشمولان في السعر؟")).toBe(true);
  });

  it("asks whether transport is private or shared when the type is unstated", () => {
    const a = analyzeFacts(rich, { text: "عرض إلى دبي في فندق 5 نجوم غرفة مزدوجة يشمل المواصلات من المطار" });
    expect(a.suggestedQuestions.some((q) => q.question.ar === "هل المواصلات خاصة أم مشتركة؟")).toBe(true);
  });

  it("asks about inter-city transfers when the offer spans several cities", () => {
    const a = analyzeFacts(rich, { text: `${RICH_TEXT}، البرنامج يشمل مدينتين وفندقين` });
    expect(a.suggestedQuestions.some((q) => q.key === "interCityTransfers")).toBe(true);
  });

  it("asks for unknown transit details without asking for facts already extracted", () => {
    const unknown = analyzeFacts(rich, { text: `${RICH_TEXT}، يوجد ترانزيت في الدوحة` });
    expect(unknown.suggestedQuestions.some((q) => q.key === "airportChange")).toBe(true);

    const explicit = analyzeFacts(
      {
        ...rich,
        transitDuration: fact({ minutes: 420 }, "ترانزيت لمدة 7 ساعات"),
        stopCount: fact(1, "توقف واحد"),
        airportChange: fact(false, "بدون تغيير مطار"),
      },
      { text: `${RICH_TEXT}، ترانزيت لمدة 7 ساعات، توقف واحد، بدون تغيير مطار` }
    );
    for (const key of ["transitDuration", "stopCount", "airportChange"]) {
      expect(explicit.suggestedQuestions.some((q) => q.key === key)).toBe(false);
    }
  });

  it("asks for the room type when accommodation lacks one", () => {
    const a = analyzeFacts(core, { text: "الإقامة في فندق خمس نجوم بمدينة دبي" });
    expect(a.suggestedQuestions.some((q) => q.question.ar === "ما نوع الغرفة وعدد الأسرّة المشمولة؟")).toBe(true);
  });

  it("asks about children's beds when children are present but occupancy is unclear", () => {
    const a = analyzeFacts(
      { ...rich, travelers: fact({ adults: 2, children: 2 }, "شخصان وطفلان") },
      { text: `${RICH_TEXT}، مع طفلين` }
    );
    expect(a.suggestedQuestions.some((q) => q.question.ar === "هل السعر يشمل أسرّة الأطفال أو السرير الإضافي؟")).toBe(true);
  });

  // no duplicate question for information already confirmed with evidence
  it("never asks about a field that is present with evidence", () => {
    const a = analyzeFacts(rich, { text: RICH_TEXT });
    for (const key of ["totalPrice", "currency", "nights", "board", "baggage", "transfers", "taxes", "cancellationPolicy", "destination", "accommodation"]) {
      expect(a.suggestedQuestions.some((q) => q.key === key)).toBe(false);
    }
  });

  // (9) facts and evidence are untouched by the question layer
  it("keeps facts, evidence, completeness and missing fields independent of the text", () => {
    const withText = analyzeFacts(core, { text: "التأشيرة غير مشمولة ومواصلات مشتركة إلى فندق" });
    const withoutText = analyzeFacts(core);
    expect(withText.confirmedFacts).toEqual(withoutText.confirmedFacts);
    expect(withText.completeness).toEqual(withoutText.completeness);
    expect(withText.missingFields).toEqual(withoutText.missingFields);
    expect(withText.confirmedFacts.find((c) => c.key === "totalPrice")?.evidence).toBe("٣٢٠٠ ر.س");
    expect(withText.confirmedFacts.some((c) => c.key === "visa")).toBe(false);
  });
});
