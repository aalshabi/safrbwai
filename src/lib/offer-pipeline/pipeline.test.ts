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
