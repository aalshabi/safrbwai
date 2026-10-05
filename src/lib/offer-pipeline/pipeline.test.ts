import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runOfferPipeline } from "./pipeline";

describe("runOfferPipeline", () => {
  it("runs text end-to-end: extract → normalize → analyze", async () => {
    const text = "عرض إلى دبي إقامة ٥ ليالٍ لشخصين شامل الإفطار، السعر الإجمالي ٣٢٠٠ ر.س، التأشيرة غير مشمولة.";
    const outcome = await runOfferPipeline({ type: "text", text });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;

    // normalization ran BEFORE analysis: the Arabic-digit price is normalized
    // to a number in the analysis output.
    const price = outcome.analysis.confirmedFacts.find((f) => f.key === "totalPrice");
    expect(price?.value).toEqual({ amount: 3200, currency: "SAR" });
    // nights normalized from ٥ → 5
    expect(outcome.analysis.confirmedFacts.find((f) => f.key === "nights")?.value).toBe(5);
    // extraction payload is carried through
    expect(outcome.extraction.facts.nights?.value).toBe(5);
  });

  it("returns unsupported for pdf/image/url (disabled sources)", async () => {
    const pdf = await runOfferPipeline({ type: "pdf", file: { name: "a.pdf", size: 10, mimeType: "application/pdf" } });
    expect(pdf).toEqual({ status: "unsupported", source: "pdf" });
    const url = await runOfferPipeline({ type: "url", url: "https://example.com" });
    expect(url.status).toBe("unsupported");
  });

  it("returns extraction_failed for blank text", async () => {
    const outcome = await runOfferPipeline({ type: "text", text: "   " });
    expect(outcome).toEqual({ status: "extraction_failed", source: "text", reason: "empty" });
  });

  it("detects a standalone Total label mismatch without inventing absent totals", async () => {
    const mismatch = await runOfferPipeline({
      type: "text",
      text: "2 adults. Total: SAR 2,000. Price SAR 1,200 per person.",
    });
    expect(mismatch.status).toBe("ok");
    if (mismatch.status !== "ok") return;

    expect(mismatch.extraction.facts.totalPrice?.value).toEqual({
      amount: 2000,
      currency: "SAR",
    });
    expect(mismatch.extraction.facts.perPersonPrice?.value).toEqual({
      amount: 1200,
      currency: "SAR",
    });
    expect(
      mismatch.analysis.contradictions.filter(
        (contradiction) => contradiction.code === "price_total_mismatch"
      )
    ).toHaveLength(1);

    const perPersonOnly = await runOfferPipeline({
      type: "text",
      text: "2 adults. Price SAR 1,200 per person.",
    });
    expect(perPersonOnly.status).toBe("ok");
    if (perPersonOnly.status !== "ok") return;
    expect(perPersonOnly.extraction.facts.totalPrice).toBeUndefined();
    expect(
      perPersonOnly.analysis.contradictions.some(
        (contradiction) => contradiction.code === "price_total_mismatch"
      )
    ).toBe(false);
  });

  it("does not emit flight details for ground-transport stops", async () => {
    for (const text of [
      "Travel offer to Istanbul for 2 adults and 5 nights. Total: SAR 2,000. Airport shuttle stops in the hotel for 2 hours. The bus stops in Doha for 2 hours.",
      "عرض إلى إسطنبول لشخصين لمدة 5 ليالٍ، والإجمالي 2,000 ريال. تتوقف الحافلة في الدوحة لمدة 2 ساعات، وخدمة النقل بها 2 توقفات قبل الفندق.",
    ]) {
      const outcome = await runOfferPipeline({ type: "text", text });
      expect(outcome.status).toBe("ok");
      if (outcome.status !== "ok") continue;
      expect(outcome.extraction.facts.transitDuration).toBeUndefined();
      expect(outcome.extraction.facts.stopCount).toBeUndefined();
      expect(outcome.analysis.confirmedFacts.some((fact) => fact.key === "transitDuration")).toBe(false);
      expect(outcome.analysis.confirmedFacts.some((fact) => fact.key === "stopCount")).toBe(false);
    }
  });

  // ordering guardrail: the orchestrator sequences extract → normalize → analyze
  it("sequences the layers in order (source scan)", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/offer-pipeline/pipeline.ts"), "utf8");
    const iExtract = source.indexOf(".extract(");
    const iNormalize = source.indexOf("normalizeExtraction(");
    const iAnalyze = source.indexOf("analyzeFacts(");
    expect(iExtract).toBeGreaterThan(-1);
    expect(iNormalize).toBeGreaterThan(iExtract);
    expect(iAnalyze).toBeGreaterThan(iNormalize);
  });
});
