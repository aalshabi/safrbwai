import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import { OfferAnalysisResult } from "./offer-analysis-result";
import { TravelOfferReview } from "./travel-offer-review";
import type { TravelOfferInput } from "@/lib/offer-input/types";

afterEach(cleanup);

const d = getDictionary("ar");

const analysis: OfferAnalysis = {
  confirmedFacts: [
    { key: "totalPrice", label: { ar: "السعر النهائي", en: "Total price" }, value: { amount: 3200, currency: "SAR" }, evidence: "٣٢٠٠ ر.س", confidenceType: "exact" },
    { key: "nights", label: { ar: "عدد الليالي", en: "Number of nights" }, value: 5, evidence: "٥ ليالٍ", confidenceType: "exact" },
  ],
  missingFields: [
    { key: "cancellationPolicy", label: { ar: "سياسة الإلغاء", en: "Cancellation policy" }, requirement: "recommended" },
  ],
  contradictions: [
    { code: "multiple_prices", message: { ar: "توجد أكثر من قيمة سعر نهائي مختلفة.", en: "Multiple prices." }, evidence: ["٣٢٠٠ ر.س", "٢٨٠٠ ر.س"], severity: "critical" },
  ],
  checklist: [
    { key: "nights", label: { ar: "عدد الليالي", en: "Nights" }, status: "present", evidence: ["٥ ليالٍ"], explanation: { ar: "واضحة.", en: "clear" } },
    { key: "cancellationPolicy", label: { ar: "سياسة الإلغاء", en: "Cancellation policy" }, status: "missing", evidence: [], explanation: { ar: "غير مذكورة.", en: "absent" } },
  ],
  suggestedQuestions: [
    { key: "cancellationPolicy", question: { ar: "ما سياسة الإلغاء والتعديل؟", en: "What is the policy?" }, priority: "medium" },
  ],
  completeness: {
    present: 2,
    required: 3,
    fields: [
      { key: "totalPrice", present: true },
      { key: "currency", present: false },
      { key: "nights", present: true },
    ],
  },
};

function renderResult() {
  return render(
    <LanguageProvider>
      <OfferAnalysisResult analysis={analysis} />
    </LanguageProvider>
  );
}

describe("OfferAnalysisResult", () => {
  it("renders confirmed facts with label, value and evidence", () => {
    renderResult();
    expect(screen.getByText(d.analyzeOffer.v2.result.confirmedTitle)).toBeTruthy();
    expect(screen.getAllByText("السعر النهائي").length).toBeGreaterThan(0);
    // evidence is shown for a confirmed fact
    expect(screen.getAllByText(/٣٢٠٠ ر\.س/).length).toBeGreaterThan(0);
  });

  it("renders missing fields, contradictions and suggested questions", () => {
    renderResult();
    expect(screen.getByText(d.analyzeOffer.v2.result.missingTitle)).toBeTruthy();
    expect(screen.getByText("توجد أكثر من قيمة سعر نهائي مختلفة.")).toBeTruthy();
    expect(screen.getByText(d.analyzeOffer.v2.result.sevCritical, { exact: false })).toBeTruthy();
    expect(screen.getByText("ما سياسة الإلغاء والتعديل؟")).toBeTruthy();
  });

  it("shows completeness as present / required with the counted fields", () => {
    const { container } = renderResult();
    expect(screen.getByText(d.analyzeOffer.v2.result.completenessTitle)).toBeTruthy();
    // no opaque score anywhere
    expect(container.textContent?.toLowerCase()).not.toContain("score");
  });
});

describe("TravelOfferReview disabled sources", () => {
  const base = { previewUrl: null, onEdit: () => {}, onConfirm: () => {} };

  function reviewFor(input: TravelOfferInput) {
    return render(
      <LanguageProvider>
        <TravelOfferReview input={input} {...base} />
      </LanguageProvider>
    );
  }

  it("enables confirm for text", () => {
    reviewFor({ type: "text", text: "عرض دبي ٥ ليالٍ", createdAt: new Date(0).toISOString() });
    const btn = screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend });
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("disables confirm for pdf/image/url and shows the coming-soon note", () => {
    for (const type of ["pdf", "image", "url"] as const) {
      const input: TravelOfferInput =
        type === "url"
          ? { type, url: "https://example.com", createdAt: new Date(0).toISOString() }
          : { type, file: { name: "f", size: 10, mimeType: "application/pdf" }, createdAt: new Date(0).toISOString() };
      const { unmount } = reviewFor(input);
      expect(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }).hasAttribute("disabled")).toBe(true);
      expect(screen.getAllByText(d.analyzeOffer.v2.comingSoon).length).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe("OfferAnalysisResult — text that is not a travel offer", () => {
  const renderResult = (value: OfferAnalysis) =>
    render(
      <LanguageProvider>
        <OfferAnalysisResult analysis={value} />
      </LanguageProvider>
    );

  it("says so when no offer fact was found", () => {
    renderResult({ ...analysis, confirmedFacts: [], contradictions: [] });
    expect(screen.getByText(d.analyzeOffer.v2.result.notAnOffer)).toBeTruthy();
  });

  it("stays quiet for an offer with a price or nights", () => {
    renderResult(analysis);
    expect(screen.queryByText(d.analyzeOffer.v2.result.notAnOffer)).toBeNull();
  });
});
