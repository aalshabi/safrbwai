import { describe, expect, it } from "vitest";
import { runOfferPipeline } from "./pipeline";

/**
 * A two-resort package as agencies send it over WhatsApp (markdown emphasis,
 * emoji labels, per-stay nights, itemized subtotals, no flights). Synthetic:
 * no client number or agency name.
 */
const OFFER = `🏝️ *موريشيوس | إقامة في منتجعين*

👥 شخصان بالغان
🌙 7 ليالٍ – 8 أيام
📅 من 8 إلى 15 نوفمبر 2026
🛏️ غرفة واحدة مع نصف إقامة في المنتجعين

*الإقامة الأولى | 4 ليالٍ*
Constance Le Chaland
• الدخول: 8 نوفمبر
• الخروج: 12 نوفمبر
• فئة الغرفة: Prestige

*الإقامة الثانية | 3 ليالٍ*
Le Meridien Ile Maurice
• الدخول: 12 نوفمبر
• الخروج: 15 نوفمبر
• فئة الغرفة: Beach Bliss Junior Suite – King

🚘 *المواصلات والجولات | سيارة صغيرة*
• استقبال وتوديع من المطار
• انتقال واحد بين المنتجعين
• 4 جولات على مدار 4 أيام، بواقع 8 ساعات يوميًا
• شريحتا إنترنت

*ملخص الأسعار لشخصين:*
💰 إجمالي الإقامة: *14,400 ريال*
💰 إجمالي المواصلات والشرائح: *1,995 ريال*

*إجمالي مبلغ الرحلة: 16,400 ريال*

الأسعار والتوفر قابلة للتغير حتى تأكيد الحجز.`;

async function analyze(text: string) {
  const outcome = await runOfferPipeline({ type: "text", text });
  if (outcome.status !== "ok") throw new Error(outcome.status);
  return outcome;
}

describe("two-resort package without flights", () => {
  it("reads 7 nights as one stay split 4 + 3, not a contradiction", async () => {
    const { extraction, analysis } = await analyze(OFFER);
    expect(extraction.facts.nights?.value).toBe(7);
    expect(analysis.contradictions.map((c) => c.code)).not.toContain("conflicting_nights");
    expect(analysis.suggestedQuestions.map((q) => q.key)).not.toContain("nights");
  });

  it("takes «إجمالي مبلغ الرحلة» as the trip total, not the accommodation subtotal", async () => {
    const { extraction, analysis } = await analyze(OFFER);
    expect(extraction.facts.totalPrice?.value).toEqual({ amount: 16400, currency: "SAR" });
    expect(extraction.facts.statedPrice).toBeUndefined();
    expect(analysis.missingFields.map((m) => m.key)).not.toContain("totalPrice");
  });

  it("flags subtotals that do not add up to the total (14,400 + 1,995 ≠ 16,400)", async () => {
    const { analysis } = await analyze(OFFER);
    const mismatch = analysis.contradictions.find((c) => c.code === "price_components_mismatch");
    expect(mismatch?.message.ar).toContain("16,395 SAR");
    expect(mismatch?.message.ar).toContain("16,400 SAR");
    expect(mismatch?.evidence).toEqual(["14,400 ريال", "1,995 ريال", "16,400 ريال"]);
  });

  it("does not flag subtotals that add up", async () => {
    const { analysis } = await analyze(OFFER.replace("16,400 ريال", "16,395 ريال"));
    expect(analysis.contradictions).toEqual([]);
  });

  it("confirms the stated travel dates", async () => {
    const { extraction, analysis } = await analyze(OFFER);
    expect(extraction.facts.travelDates?.value).toBe("من 8 إلى 15 نوفمبر 2026");
    expect(analysis.missingFields.map((m) => m.key)).not.toContain("travelDates");
  });

  it("does not ask about baggage when the offer has no flights", async () => {
    const { analysis } = await analyze(OFFER);
    expect(analysis.suggestedQuestions.map((q) => q.key)).not.toContain("baggage");
  });

  it("still asks about baggage when flights are part of the offer", async () => {
    const { analysis } = await analyze(`${OFFER}\nالطيران مشمول ذهابًا وعودة.`);
    expect(analysis.suggestedQuestions.map((q) => q.key)).toContain("baggage");
  });
});
