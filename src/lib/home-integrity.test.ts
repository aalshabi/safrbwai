import { describe, it, expect } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SITE_ROBOTS } from "@/lib/seo";

const ar = getDictionary("ar");
const en = getDictionary("en");

// Text that appears on the home page (hero, benefits, how, cta, footer tagline).
const homeText = [
  ar.hero,
  ar.benefits,
  ar.how,
  ar.cta,
  ar.footer.tagline,
  en.hero,
  en.benefits,
  en.how,
  en.cta,
  en.footer.tagline,
]
  .map((v) => JSON.stringify(v))
  .join(" ");

describe("home page integrity", () => {
  it("uses the approved pre-launch product description in both languages", () => {
    expect(ar.hero.subtitle).toBe(
      "سافر بوعي أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز."
    );
    expect(en.hero.subtitle).toBe(
      "SafrBwai helps you review the information stated in travel offers and make a clearer decision before booking."
    );
    expect(ar.productStage.prelaunchNotice).toBe(
      "إصدار ما قبل الإطلاق — تحقق دائمًا من المصدر الرسمي قبل أي التزام مالي."
    );
    expect(en.productStage.prelaunchNotice).toBe(
      "Pre-launch release — always verify with the official source before making a financial commitment."
    );
  });

  it("does not expose stale demo or closed-Beta wording on current launch surfaces", () => {
    const launchSurfaceText = JSON.stringify({
      ar: {
        meta: ar.meta,
        hero: ar.hero,
        footer: ar.footer,
        currentNotice: ar.productStage.prelaunchNotice,
      },
      en: {
        meta: en.meta,
        hero: en.hero,
        footer: en.footer,
        currentNotice: en.productStage.prelaunchNotice,
      },
    });

    for (const staleText of [
      "مشروع تجريبي",
      "نسخة تجريبية محدودة",
      "experimental project",
      "Limited Beta",
      "Demo version",
    ]) {
      expect(launchSurfaceText).not.toContain(staleText);
    }
  });

  it("describes only current text-analysis behavior on the home page", () => {
    expect(ar.how.step1Desc).toContain("نص عرض سفر");
    expect(en.how.step1Desc).toContain("travel-offer text");
    expect(ar.how.step2Desc).toContain("بقواعد ثابتة");
    expect(en.how.step2Desc).toContain("fixed rules");

    const currentHowAndPillars = JSON.stringify({
      ar: { how: ar.how, pillars: ar.pillars },
      en: { how: en.how, pillars: en.pillars },
    });
    for (const inactiveClaim of [
      "رابط العرض",
      "تنبيهات سريعة",
      "الحجز الذكي",
      "offer link",
      "Fast alerts",
      "Smart booking",
    ]) {
      expect(currentHowAndPillars).not.toContain(inactiveClaim);
    }
  });

  // (1) no fabricated stat numbers
  it("contains none of the fabricated stats (96%, 250k, 12k, 40k)", () => {
    for (const token of ["96%", "٩٦", "250k", "٢٥٠", "12k", "١٢ ألف", "40k", "٤٠ ألف"]) {
      expect(homeText).not.toContain(token);
    }
  });

  it("qualitative benefits contain no digits at all", () => {
    const benefits = [
      ar.benefits.clearer,
      ar.benefits.gaps,
      ar.benefits.compare,
      ar.benefits.questions,
      en.benefits.clearer,
      en.benefits.gaps,
      en.benefits.compare,
      en.benefits.questions,
    ].join(" ");
    expect(benefits).not.toMatch(/[0-9٠-٩]/);
  });

  // (2) no "multiple sources / sourced analysis" claim
  it("makes no multiple-sources / sourced-analysis claim", () => {
    expect(homeText).not.toContain("مصادر متعددة");
    expect(homeText.toLowerCase()).not.toContain("sourced analysis");
    expect(homeText.toLowerCase()).not.toContain("multiple signals");
  });

  it("does not claim to be AI-powered", () => {
    expect(homeText).not.toContain("ذكاء اصطناعي");
    expect(homeText.toLowerCase()).not.toMatch(/\bai\b/);
    expect(homeText).not.toContain("دقة");
  });

  // (8) public pages are indexable after the launch gate passed
  it("opens public pages to search indexes", () => {
    expect(SITE_ROBOTS.index).toBe(true);
    expect(SITE_ROBOTS.follow).toBe(true);
  });
});
