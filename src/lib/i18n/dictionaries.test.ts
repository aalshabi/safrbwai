import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { getDictionary } from "./dictionaries";

function dictionaryKeyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [path, ...dictionaryKeyPaths(child, path)];
  });
}

describe("product dictionary", () => {
  it("uses the approved product name in both languages", () => {
    expect(getDictionary("ar").brand.name).toBe("سافر بوعي");
    expect(getDictionary("en").brand.name).toBe("SafrBwai");
  });

  it("uses the approved CTA and unavailable-account copy", () => {
    const ar = getDictionary("ar");
    const en = getDictionary("en");

    expect(ar.cta.button).toBe("حلّل عرض سفر");
    expect(en.cta.button).toBe("Analyze a travel offer");
    expect(ar.auth.unavailableTitle).toBe("الحسابات غير متاحة في الإصدار الحالي.");
    expect(en.auth.unavailableTitle).toBe("Accounts are not available in the current release.");
    expect(ar.auth.unavailableAction).toBe("حلّل عرض سفر");
    expect(en.auth.unavailableAction).toBe("Analyze a travel offer");
  });

  it("exposes the exact pre-launch notice in both languages", () => {
    expect(getDictionary("ar").productStage.prelaunchNotice).toBe(
      "إصدار ما قبل الإطلاق — تحقق دائمًا من المصدر الرسمي قبل أي التزام مالي."
    );
    expect(getDictionary("en").productStage.prelaunchNotice).toBe(
      "Pre-launch release — always verify with the official source before making a financial commitment."
    );
  });

  it("describes the enabled text-analysis confirmation step accurately", () => {
    const arReview = getDictionary("ar").analyzeOffer.v1.review;
    const enReview = getDictionary("en").analyzeOffer.v1.review;

    expect(arReview.statusText).toBe("جاهز للتحليل — سيبدأ التحليل عند التأكيد.");
    expect(arReview.confirmDisabledTip).toBe("أكمل إدخال نص صالح قبل التأكيد.");
    expect(enReview.statusText).toBe(
      "Ready for analysis — analysis will start after confirmation."
    );
    expect(enReview.confirmDisabledTip).toBe(
      "Complete a valid text input before confirming."
    );

    const reviewCopy = JSON.stringify({ arReview, enReview });
    expect(reviewCopy).not.toContain("المرحلة التالية");
    expect(reviewCopy).not.toContain("next phase");
    expect(reviewCopy).not.toContain("not enabled yet");
  });

  it("exposes the offer 'extraction not enabled' message", () => {
    expect(getDictionary("ar").demo.offerTitle).toContain("غير مفعّل");
    expect(getDictionary("en").demo.offerBody).toMatch(/does not|OCR/i);
  });

  it("exposes the neutral current-unavailability replacement text", () => {
    expect(getDictionary("ar").demo.unavailable).toContain("غير متاح");
    expect(getDictionary("en").demo.unavailable).toContain("Not currently available");
  });

  it("exposes beta feedback messages and reasons in both languages", () => {
    const ar = getDictionary("ar").analyzeOffer.v2.feedback;
    const en = getDictionary("en").analyzeOffer.v2.feedback;

    expect(ar.question).toBe("هل كانت النتيجة مفيدة؟");
    expect(ar.thanks).toBe("شكرًا، تم تسجيل ملاحظتك.");
    expect(ar.reasons.other).toBe("سبب آخر");
    expect(en.question).toBe("Was this result helpful?");
    expect(en.thanks).toBe("Thank you. Your feedback was recorded.");
    expect(en.reasons.other).toBe("Another reason");
  });

  it("keeps result-copy translations aligned in Arabic and English", () => {
    const ar = getDictionary("ar").analyzeOffer.v2.result.copy;
    const en = getDictionary("en").analyzeOffer.v2.result.copy;

    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    expect(ar.questionsButton).toBe("نسخ الأسئلة");
    expect(ar.summaryButton).toBe("نسخ الملخص");
    expect(en.questionsButton).toBe("Copy questions");
    expect(en.summaryButton).toBe("Copy summary");
  });

  it("keeps every Arabic and English dictionary key aligned", () => {
    const arKeys = dictionaryKeyPaths(getDictionary("ar")).sort();
    const enKeys = dictionaryKeyPaths(getDictionary("en")).sort();

    expect(arKeys).toEqual(enKeys);
  });

  it("contains no unapproved English name on user-visible brand surfaces", () => {
    const unapprovedName = ["Safer", "Bewae"].join(" ");
    const visibleSources = [
      "README.md",
      "src/app/layout.tsx",
      "src/app/manifest.ts",
      "src/app/page.tsx",
      "src/components/legal-page.tsx",
      "src/lib/i18n/dictionaries.ts",
      "src/lib/seo.ts",
    ];

    expect(JSON.stringify(getDictionary("en"))).not.toContain(unapprovedName);
    for (const path of visibleSources) {
      expect(readFileSync(join(process.cwd(), path), "utf8")).not.toContain(unapprovedName);
    }
  });

  it("exposes the release scope and safety copy in both languages", () => {
    const ar = getDictionary("ar").analyzeOffer.v2.releaseScope;
    const en = getDictionary("en").analyzeOffer.v2.releaseScope;

    expect(ar.title).toBe("الإصدار الأول");
    expect(ar.supportedSources).toBe(
      "يمكنك لصق النص أو اختيار ملف PDF أو صورة أو إدخال رابط العرض. يُقرأ الملف والصورة على جهازك ولا يُرفعان، ويقرأ خادمنا الصفحة العامة للرابط دون حفظها."
    );
    expect(en.title).toBe("First release");
    expect(en.supportedSources).toBe(
      "Paste text, choose a PDF or an image, or enter the offer link. Files and images are read on your device and not uploaded; our server reads a link's public page without storing it."
    );
  });
});
