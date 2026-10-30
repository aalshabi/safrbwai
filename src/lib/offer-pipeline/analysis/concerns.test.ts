import { describe, expect, it } from "vitest";
import { runOfferPipeline } from "../pipeline";

async function analyze(text: string) {
  const outcome = await runOfferPipeline({ type: "text", text });
  if (outcome.status !== "ok") throw new Error(`pipeline ${outcome.status}`);
  return outcome.analysis;
}

const MALDIVES =
  "باقة المالديف 4 ليالٍ لشخصين في منتجع على جزيرة خاصة، شامل الإفطار، الانتقال بالطائرة المائية، الطيران الدولي من الرياض بوصول الساعة 6 مساءً، السعر الإجمالي 18,000 ر.س.";

describe("inferred concerns", () => {
  it("asks to match the international arrival with the resort transfer on a Maldives itinerary, without a fixed cutoff", async () => {
    const analysis = await analyze(MALDIVES);
    const keys = analysis.concerns.map((c) => c.key);
    expect(keys).toContain("resortTransferTiming");
    expect(keys).toContain("seaplaneBaggage");
    expect(keys).toContain("resortMeals");

    const timing = analysis.concerns.find((c) => c.key === "resortTransferTiming")!;
    // No universal cutoff time and no guarantee of the connection.
    expect(timing.detail.ar).toContain("لا يوجد موعد نهائي واحد");
    expect(timing.detail.ar).not.toMatch(/\d{1,2}[:٫.]\d{2}|الساعة \d/);
    expect(timing.basis.ar).toContain("المالديف");
    expect(timing.question.ar).toContain("آخر موعد لوصول الرحلة الدولية");
    expect(analysis.concerns.find((c) => c.key === "resortMeals")?.basis.ar).toBe("خطة الوجبات المذكورة: الإفطار.");
  });

  it("keeps concerns apart from stated facts and missing information", async () => {
    const analysis = await analyze(MALDIVES);
    const factKeys = new Set(analysis.confirmedFacts.map((f) => f.key));
    const missingKeys = new Set(analysis.missingFields.map((m) => m.key));
    for (const concern of analysis.concerns) {
      expect(factKeys.has(concern.key)).toBe(false);
      expect(missingKeys.has(concern.key)).toBe(false);
    }
    // The meal plan is a stated fact; the concern only builds on it.
    expect(factKeys.has("board")).toBe(true);
  });

  it("raises no meals concern for an all-inclusive Maldives stay", async () => {
    const analysis = await analyze("باقة المالديف 4 ليالٍ شامل كليًا (All Inclusive)، الانتقال بالقارب السريع، السعر الإجمالي 20,000 ر.س، الدفع كاملًا عند الحجز.");
    expect(analysis.concerns.map((c) => c.key)).toEqual(["resortTransferTiming"]);
  });

  it("raises nothing island-specific for an offer elsewhere", async () => {
    const analysis = await analyze("عرض إلى دبي إقامة 5 ليالٍ لشخصين شامل الإفطار، السعر الإجمالي 3200 ر.س، الدفع عند الحجز.");
    expect(analysis.concerns.map((c) => c.key)).toEqual([]);
  });

  it("flags deposits, substitutable hotels and non-refundable terms only when the offer says so", async () => {
    const analysis = await analyze(
      "عرض إسطنبول 5 ليالٍ فندق 4 نجوم أو ما يعادله، السعر الإجمالي 6000 ر.س، عربون 1000 ر.س، التذاكر غير قابلة للاسترداد."
    );
    expect(analysis.concerns.map((c) => c.key).sort()).toEqual(["depositTerms", "hotelSubstitution", "nonRefundable"]);
  });

  it("does not claim a deposit when the offer says there is none", async () => {
    for (const text of [
      "عرض إسطنبول 5 ليالٍ، السعر الإجمالي 6000 ر.س، بدون عربون، الدفع عند الوصول.",
      "Istanbul package, 5 nights, total SAR 6,000. No deposit required; full payment on arrival.",
      "عرض دبي 4 ليالٍ، السعر الإجمالي 5000 ر.س، العربون غير مطلوب.",
    ]) {
      const analysis = await analyze(text);
      expect(analysis.concerns.map((c) => c.key)).not.toContain("depositTerms");
    }
  });

  it("still raises the deposit concern when one is actually asked for", async () => {
    const analysis = await analyze("عرض إسطنبول 5 ليالٍ، السعر الإجمالي 6000 ر.س، عربون 1000 ر.س عند الحجز.");
    expect(analysis.concerns.map((c) => c.key)).toContain("depositTerms");
  });

  it("notes unstated payment terms as a question, not as a hidden condition", async () => {
    const analysis = await analyze("عرض إلى دبي إقامة 5 ليالٍ لشخصين، السعر الإجمالي 3200 ر.س.");
    const payment = analysis.concerns.find((c) => c.key === "paymentSchedule");
    expect(payment?.detail.ar).toContain("لا يعني وجود شرط مخفي");
  });
});
