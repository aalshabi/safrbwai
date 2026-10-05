import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import {
  formatSummaryForCopy,
  type SummaryCopyLabels,
} from "./format-summary";

const ORIGINAL_OFFER =
  "ORIGINAL_OFFER_TEXT destination and private source content";
const INTERNAL_EVIDENCE = "INTERNAL_EVIDENCE_FROM_OFFER";

const analysis: OfferAnalysis = {
  confirmedFacts: [
    {
      key: "destination",
      label: { ar: "الوجهة", en: "Destination" },
      value: "دبي",
      evidence: INTERNAL_EVIDENCE,
      confidenceType: "exact",
    },
    {
      key: "nights",
      label: { ar: "عدد الليالي", en: "Nights" },
      value: 5,
      evidence: INTERNAL_EVIDENCE,
      confidenceType: "exact",
    },
    {
      key: "totalPrice",
      label: { ar: "السعر", en: "Price" },
      value: { amount: 3200, currency: "SAR" },
      evidence: INTERNAL_EVIDENCE,
      confidenceType: "exact",
    },
    {
      key: "transitDuration",
      label: { ar: "مدة الترانزيت", en: "Transit duration" },
      value: { minutes: 420 },
      evidence: INTERNAL_EVIDENCE,
      confidenceType: "exact",
    },
  ],
  missingFields: [
    {
      key: "cancellationPolicy",
      label: { ar: "سياسة الإلغاء", en: "Cancellation policy" },
      requirement: "recommended",
    },
    {
      key: "taxes",
      label: { ar: "الضرائب والرسوم", en: "Taxes and fees" },
      requirement: "recommended",
    },
  ],
  contradictions: [
    {
      code: "multiple_prices",
      message: {
        ar: "توجد أسعار نهائية متعارضة.",
        en: "Conflicting final prices were found.",
      },
      evidence: [INTERNAL_EVIDENCE],
      severity: "critical",
    },
  ],
  checklist: [
    {
      key: "internal",
      label: { ar: "داخلي", en: "Internal" },
      status: "missing",
      evidence: [INTERNAL_EVIDENCE],
      explanation: { ar: ORIGINAL_OFFER, en: ORIGINAL_OFFER },
    },
  ],
  suggestedQuestions: [
    {
      key: "taxes",
      question: {
        ar: "هل السعر النهائي يشمل جميع الضرائب والرسوم؟",
        en: "Does the final price include all taxes and fees?",
      },
      priority: "high",
    },
    {
      key: "cancellationPolicy",
      question: {
        ar: "ما سياسة الإلغاء والتعديل؟",
        en: "What is the cancellation and amendment policy?",
      },
      priority: "medium",
    },
  ],
  completeness: {
    present: 3,
    required: 10,
    fields: [{ key: "destination", present: true }],
  },
};

function labels(locale: Locale): SummaryCopyLabels {
  const result = getDictionary(locale).analyzeOffer.v2.result;
  return {
    title: result.copy.summaryTitle,
    confirmedTitle: result.confirmedTitle,
    missingTitle: result.missingTitle,
    contradictionsTitle: result.contradictionsTitle,
    questionsTitle: result.questionsTitle,
    disclaimer: result.copy.disclaimer,
    brandLabel: result.copy.brandLabel,
    value: {
      yes: result.yes,
      no: result.no,
      adults: result.adults,
      children: result.children,
      destinationStated: result.destinationStated,
    },
  };
}

describe("formatSummaryForCopy", () => {
  it("formats an Arabic summary from confirmed facts only", () => {
    const text = formatSummaryForCopy(analysis, "ar", labels("ar"));
    const confirmedSection = text.slice(
      text.indexOf("الحقائق المؤكدة:"),
      text.indexOf("معلومات ناقصة:")
    );

    expect(text).toContain("مراجعة عرض السفر");
    expect(confirmedSection).toContain("- الوجهة: دبي");
    expect(confirmedSection).toContain("- عدد الليالي: ٥");
    expect(confirmedSection).toContain("- السعر: ٣٬٢٠٠ SAR");
    expect(confirmedSection).toContain("- مدة الترانزيت: ٧ ساعات");
    expect(confirmedSection).not.toContain("سياسة الإلغاء");
  });

  it("formats an English summary from confirmed facts only", () => {
    const text = formatSummaryForCopy(analysis, "en", labels("en"));
    const confirmedSection = text.slice(
      text.indexOf("Confirmed facts:"),
      text.indexOf("Missing information:")
    );

    expect(text).toContain("Travel offer review");
    expect(confirmedSection).toContain("- Destination: دبي");
    expect(confirmedSection).toContain("- Nights: 5");
    expect(confirmedSection).toContain("- Price: 3,200 SAR");
    expect(confirmedSection).toContain("- Transit duration: 7 hours");
    expect(confirmedSection).not.toContain("Cancellation policy");
  });

  it("keeps missing information, contradictions and questions separate", () => {
    const text = formatSummaryForCopy(analysis, "en", labels("en"));

    expect(text).toContain(
      "Missing information:\n- Cancellation policy\n- Taxes and fees"
    );
    expect(text).toContain(
      "Contradictions:\n- Conflicting final prices were found."
    );
    expect(text).toContain(
      "Suggested questions before booking:\n1. Does the final price include all taxes and fees?"
    );
  });

  it("omits empty sections instead of rendering empty headings", () => {
    const emptyAnalysis: OfferAnalysis = {
      ...analysis,
      confirmedFacts: [],
      missingFields: [],
      contradictions: [],
      suggestedQuestions: [],
    };
    const text = formatSummaryForCopy(
      emptyAnalysis,
      "en",
      labels("en")
    );

    expect(text).not.toContain("Confirmed facts:");
    expect(text).not.toContain("Missing information:");
    expect(text).not.toContain("Contradictions:");
    expect(text).not.toContain("Suggested questions before booking:");
  });

  it("includes the localized disclaimer and canonical project link", () => {
    const ar = formatSummaryForCopy(analysis, "ar", labels("ar"));
    const en = formatSummaryForCopy(analysis, "en", labels("en"));

    expect(ar).toContain(
      "هذه مراجعة مساعدة وليست ضمانًا لصحة العرض أو البائع."
    );
    expect(ar).toContain("سافر بوعي:\nhttps://www.safrbwai.com");
    expect(en).toContain(
      "This review is an aid and does not guarantee the accuracy of the offer or the seller."
    );
    expect(en).toContain("SafrBwai:\nhttps://www.safrbwai.com");
  });

  it("does not copy evidence, source text, debug metadata or scoring", () => {
    const text = formatSummaryForCopy(analysis, "en", labels("en"));

    expect(text).not.toContain(INTERNAL_EVIDENCE);
    expect(text).not.toContain(ORIGINAL_OFFER);
    expect(text).not.toContain("requestId");
    expect(text).not.toContain("schemaVersion");
    expect(text).not.toContain("confidenceType");
    expect(text).not.toContain("matchType");
    expect(text).not.toContain("score");
    expect(text).not.toContain("3 of 10");
  });
});
