import { describe, expect, it } from "vitest";
import { extractFactsFromText } from "./extractors/text/text-extractor";
import { runOfferPipeline } from "./pipeline";

describe("multiple final price observations", () => {
  it("keeps the first price confirmed and reports one multiple-prices contradiction", async () => {
    const source = {
      type: "text",
      text: "عرض إلى دبي لمدة 4 ليالٍ؛ السعر النهائي 3200 ريال، والسعر النهائي 3500 ريال.",
    } as const;
    const outcome = await runOfferPipeline(source);
    const repeated = await runOfferPipeline(source);

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;

    expect(repeated).toEqual(outcome);
    const confirmedPrices = outcome.analysis.confirmedFacts.filter(
      (fact) => fact.key === "totalPrice"
    );
    expect(confirmedPrices).toHaveLength(1);
    expect(confirmedPrices[0]?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "multiple_prices"
      )
    ).toHaveLength(1);
    expect(outcome.analysis.suggestedQuestions.length).toBeLessThanOrEqual(5);
    expect(outcome.extraction).not.toHaveProperty("observations");
  });

  it("deduplicates the same normalized price without reporting a contradiction", async () => {
    const text =
      "السعر النهائي 3200 ريال، والسعر النهائي ٣٢٠٠ ر.س، لعرض إلى دبي لمدة 4 ليالٍ.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.prices).toEqual([
      { amount: 3200, currency: "SAR", basis: "total", evidence: "3200 ريال" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.analysis.contradictions).not.toContainEqual(
      expect.objectContaining({ code: "multiple_prices" })
    );
  });

  it("does not collect hotel stars, baggage weight, or nights as prices", () => {
    const extracted = extractFactsFromText(
      "فندق 5 نجوم، أمتعة 23 كجم، لمدة 4 ليالٍ، والسعر النهائي 3200 ريال."
    );

    expect(extracted.observations?.prices).toEqual([
      { amount: 3200, currency: "SAR", basis: "total", evidence: "3200 ريال" },
    ]);
  });

  it("detects two supported English final prices without changing the first fact", async () => {
    const text =
      "Final price SAR 3,200 for a 4-night Dubai offer; final price SAR 3,500.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.prices).toEqual([
      { amount: 3200, currency: "SAR", basis: "total", evidence: "SAR 3,200" },
      { amount: 3500, currency: "SAR", basis: "total", evidence: "SAR 3,500" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.extraction.facts.price?.value).toEqual({
      amount: 3200,
      currency: "SAR",
    });
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "multiple_prices"
      )
    ).toHaveLength(1);
  });

  it("does not treat itemized hotel and flight costs as conflicting final prices", async () => {
    const text =
      "الفندق 2000 ريال، والطيران 1200 ريال، والسعر الإجمالي 3200 ريال.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.prices).toEqual([
      { amount: 3200, currency: "SAR", basis: "total", evidence: "3200 ريال" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.extraction.facts.price?.value).toEqual({
      amount: 3200,
      currency: "SAR",
    });
    expect(outcome.analysis.contradictions).not.toContainEqual(
      expect.objectContaining({ code: "multiple_prices" })
    );
  });

  it("reports conflicting currency for equal final amounts in different currencies", async () => {
    const text =
      "السعر النهائي 3200 ريال، والسعر النهائي 3200 دولار.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.currencies).toEqual([
      { code: "SAR", evidence: "3200 ريال" },
      { code: "USD", evidence: "3200 دولار" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.analysis.contradictions).not.toContainEqual(
      expect.objectContaining({ code: "multiple_prices" })
    );
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "conflicting_currency"
      )
    ).toHaveLength(1);
  });

  it("reports both price and currency conflicts for different final prices", async () => {
    const text =
      "السعر النهائي 3200 ريال، والسعر النهائي 3500 دولار.";
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "multiple_prices"
      )
    ).toHaveLength(1);
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "conflicting_currency"
      )
    ).toHaveLength(1);
  });
});
