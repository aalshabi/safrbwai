import { describe, expect, it } from "vitest";
import { formatQuestionsForCopy } from "@/lib/result-actions/format-questions";
import { formatSummaryForCopy } from "@/lib/result-actions/format-summary";
import { extractFactsFromText } from "./extractors/text/text-extractor";
import { runOfferPipeline } from "./pipeline";

const conflictingArabic =
  "عرض إلى مسقط بسعر 2900 ريال، يتضمن 4 ليالٍ، ويذكر لاحقًا 6 ليالٍ.";

describe("multiple night observations", () => {
  it("keeps the first Arabic night count and reports one deterministic contradiction", async () => {
    const extracted = extractFactsFromText(conflictingArabic);
    const first = await runOfferPipeline({ type: "text", text: conflictingArabic });
    const second = await runOfferPipeline({ type: "text", text: conflictingArabic });

    expect(extracted.facts.nights?.value).toBe(4);
    expect(extracted.observations?.nights).toEqual([
      { value: 4, evidence: "4 ليالٍ" },
      { value: 6, evidence: "6 ليالٍ" },
    ]);
    expect(first).toEqual(second);
    expect(first.status).toBe("ok");
    if (first.status !== "ok") return;

    expect(
      first.analysis.confirmedFacts.filter((fact) => fact.key === "nights")
    ).toHaveLength(1);
    expect(
      first.analysis.confirmedFacts.find((fact) => fact.key === "nights")?.value
    ).toBe(4);
    expect(
      first.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "conflicting_nights"
      )
    ).toHaveLength(1);
    expect(first.analysis.suggestedQuestions).toHaveLength(5);
    expect(first.extraction).not.toHaveProperty("observations");
  });

  it("deduplicates equivalent Arabic and Western night counts", async () => {
    const text = "العرض 4 ليالٍ، وتأكيدًا يشمل ٤ ليالٍ.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.nights).toEqual([
      { value: 4, evidence: "4 ليالٍ" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.analysis.contradictions).not.toContainEqual(
      expect.objectContaining({ code: "conflicting_nights" })
    );
  });

  it("deduplicates repeated conflicting values and reports one contradiction", async () => {
    const text = "العرض 4 ليالٍ ثم 6 ليالٍ ثم 6 ليالٍ.";
    const extracted = extractFactsFromText(text);
    const outcome = await runOfferPipeline({ type: "text", text });

    expect(extracted.observations?.nights).toEqual([
      { value: 4, evidence: "4 ليالٍ" },
      { value: 6, evidence: "6 ليالٍ" },
    ]);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(
      outcome.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "conflicting_nights"
      )
    ).toHaveLength(1);
  });

  it("does not treat stars, prices, travellers, baggage, or days as night counts", async () => {
    const cases = [
      "فندق 5 نجوم لمدة 4 ليالٍ بسعر 2900 ريال.",
      "لشخصين وطفل واحد، الإقامة 4 ليالٍ، والأمتعة 23 كجم.",
      "4 ليالٍ و5 أيام.",
    ];

    for (const text of cases) {
      const extracted = extractFactsFromText(text);
      const outcome = await runOfferPipeline({ type: "text", text });

      expect(extracted.facts.nights?.value).toBe(4);
      expect(extracted.observations?.nights).toEqual([
        { value: 4, evidence: "4 ليالٍ" },
      ]);
      expect(outcome.status).toBe("ok");
      if (outcome.status !== "ok") continue;
      expect(outcome.analysis.contradictions).not.toContainEqual(
        expect.objectContaining({ code: "conflicting_nights" })
      );
    }

    const datesOnly = extractFactsFromText(
      "الوصول 4 أغسطس والمغادرة 6 أغسطس."
    );
    expect(datesOnly.facts.nights).toBeUndefined();
    expect(datesOnly.observations).toBeUndefined();

    const priceOnly = extractFactsFromText("السعر النهائي 2900 ريال.");
    expect(priceOnly.observations).not.toHaveProperty("nights");
  });

  it("collects and deduplicates supported English night counts", async () => {
    const conflicting =
      "The offer includes 4 nights and later states 6 nights.";
    const repeated = "4 nights, confirmed as 4 nights.";

    const conflictingExtraction = extractFactsFromText(conflicting);
    const conflictingOutcome = await runOfferPipeline({
      type: "text",
      text: conflicting,
    });
    const repeatedExtraction = extractFactsFromText(repeated);
    const repeatedOutcome = await runOfferPipeline({
      type: "text",
      text: repeated,
    });

    expect(conflictingExtraction.observations?.nights).toEqual([
      { value: 4, evidence: "4 nights" },
      { value: 6, evidence: "6 nights" },
    ]);
    expect(conflictingOutcome.status).toBe("ok");
    if (conflictingOutcome.status === "ok") {
      expect(
        conflictingOutcome.analysis.contradictions.filter(
          (contradiction) => contradiction.code === "conflicting_nights"
        )
      ).toHaveLength(1);
    }

    expect(repeatedExtraction.observations?.nights).toEqual([
      { value: 4, evidence: "4 nights" },
    ]);
    expect(repeatedOutcome.status).toBe("ok");
    if (repeatedOutcome.status === "ok") {
      expect(repeatedOutcome.analysis.contradictions).not.toContainEqual(
        expect.objectContaining({ code: "conflicting_nights" })
      );
    }
  });

  it("keeps evidence in the analysis contract but out of copied text", async () => {
    const outcome = await runOfferPipeline({
      type: "text",
      text: conflictingArabic,
    });

    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;

    expect(
      outcome.analysis.confirmedFacts.find((fact) => fact.key === "nights")
        ?.evidence
    ).toBe("4 ليالٍ");
    expect(
      outcome.analysis.contradictions.find(
        (contradiction) => contradiction.code === "conflicting_nights"
      )?.evidence
    ).toEqual(["4 ليالٍ", "6 ليالٍ"]);

    const questions = formatQuestionsForCopy(
      outcome.analysis.suggestedQuestions,
      "ar",
      {
        title: "أسئلة مقترحة قبل الحجز",
        reviewedWith: "تمت المراجعة عبر سافر بوعي",
      }
    );
    const summary = formatSummaryForCopy(outcome.analysis, "ar", {
      title: "ملخص العرض",
      confirmedTitle: "الحقائق المؤكدة",
      missingTitle: "معلومات ناقصة",
      contradictionsTitle: "تناقضات",
      questionsTitle: "أسئلة مقترحة",
      disclaimer: "راجع التفاصيل قبل الحجز.",
      brandLabel: "سافر بوعي",
      value: {
        yes: "نعم",
        no: "لا",
        adults: "بالغون",
        children: "أطفال",
        destinationStated: "الوجهة مذكورة",
      },
    });

    expect(questions).not.toContain("4 ليالٍ");
    expect(questions).not.toContain("6 ليالٍ");
    expect(summary).not.toContain("4 ليالٍ");
    expect(summary).not.toContain("6 ليالٍ");
  });
});

describe("separate stays of the same length", () => {
  it("asks how many nights instead of confirming one stay as the package", async () => {
    const outcome = await runOfferPipeline({
      type: "text",
      text: "Bali offer, SAR 9,000 total.\nHotel A: 4 nights\nHotel B: 4 nights",
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;

    expect(outcome.extraction.facts.nights).toBeUndefined();
    expect(outcome.analysis.confirmedFacts.map((fact) => fact.key)).not.toContain("nights");
    expect(outcome.analysis.missingFields.map((field) => field.key)).toContain("nights");
    expect(outcome.analysis.suggestedQuestions.map((q) => q.key)).toContain("nights");
  });

  it("confirms the stated total when the equal stays add up to it", async () => {
    const outcome = await runOfferPipeline({
      type: "text",
      text: "Bali, 8 nights, SAR 9,000 total.\nHotel A: 4 nights\nHotel B: 4 nights",
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;

    expect(outcome.extraction.facts.nights?.value).toBe(8);
    expect(outcome.analysis.contradictions.map((c) => c.code)).not.toContain("conflicting_nights");
    expect(outcome.analysis.suggestedQuestions.map((q) => q.key)).not.toContain("nights");
  });
});
