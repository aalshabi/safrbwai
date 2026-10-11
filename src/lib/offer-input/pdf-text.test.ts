// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { getDocumentProxy } from "unpdf";
import { runOfferPipeline } from "@/lib/offer-pipeline/pipeline";
import {
  extractOfferTextFromPdf,
  normalizeExtractedText,
  rebuildLine,
  type LoadPdfDocument,
  type PdfTextRun,
} from "./pdf-text";

// Synthetic PDFs printed from HTML by a browser engine (fixtures/pdf).
const fixture = (name: string) =>
  new Uint8Array(readFileSync(join(__dirname, "__fixtures__", "pdf", `${name}.pdf`)));
const load: LoadPdfDocument = (data) => getDocumentProxy(data);
const extract = (name: string) => extractOfferTextFromPdf(fixture(name), load);

const AR_SOURCE =
  "عرض إلى دبي لمدة 4 ليالٍ لشخصين، الإقامة في فندق 4 نجوم، شامل الإفطار. السعر الإجمالي 3200 ريال شامل الضرائب. السعر لا يشمل تذاكر الطيران. استقبال وتوديع من وإلى المطار. الإلغاء مجاني قبل 7 أيام.";

describe("extractOfferTextFromPdf — text-layer PDFs", () => {
  it("rebuilds an Arabic PDF in logical reading order", async () => {
    const result = await extract("ar-offer");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pages).toBe(1);
    // The heading stays on its own line; the paragraph's wrapped rows join.
    expect(result.text.startsWith("عرض سفر تجريبي\n")).toBe(true);
    expect(result.text).toContain("عرض إلى دبي لمدة 4 ليالٍ لشخصين");
    // Wrapped across two rows in the PDF; joined back into one clause.
    expect(result.text).toContain("السعر لا يشمل تذاكر الطيران");
    expect(result.text).toContain("3200 ريال");
    expect(result.text).not.toMatch(/[ﭐ-﷿ﹰ-﻿]/);
    expect(result.text).not.toContain("ی");
  });

  it("extracts an English PDF unchanged", async () => {
    const result = await extract("en-offer");
    expect(result.ok && result.text).toContain("The price does not include flights.");
    expect(result.ok && result.text).toContain("Total price SAR 3200 including taxes.");
  });

  it("keeps Latin names, digits and parentheses in order inside Arabic lines", async () => {
    const result = await extract("mixed-offer");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("في فندق Grand Bosphorus Hotel لشخصين");
    expect(result.text).toContain("السعر الإجمالي 4500 ريال");
    expect(result.text).toContain("(Breakfast included)");
    expect(result.text).toContain("غير شامل الطيران");
  });

  it("yields the same offer facts as pasting the source text", async () => {
    const result = await extract("ar-offer");
    if (!result.ok) throw new Error(result.reason);
    const fromPdf = await runOfferPipeline({ type: "text", text: result.text });
    const fromText = await runOfferPipeline({ type: "text", text: AR_SOURCE });
    expect(fromPdf.status).toBe("ok");
    expect(fromText.status).toBe("ok");
    if (fromPdf.status !== "ok" || fromText.status !== "ok") return;

    const values = (facts: typeof fromPdf.extraction.facts) =>
      Object.fromEntries(Object.entries(facts).map(([key, fact]) => [key, fact?.value]));
    expect(values(fromPdf.extraction.facts)).toEqual(values(fromText.extraction.facts));
    expect(fromPdf.extraction.facts.flight?.value).toEqual({ included: false });
    expect(fromPdf.extraction.facts.destination?.value.canonicalValue).toBe("Dubai");
  });
});

describe("extractOfferTextFromPdf — refusals, never a guess", () => {
  it("refuses an image-only PDF instead of running OCR", async () => {
    expect(await extract("image-only")).toEqual({ ok: false, reason: "no_text" });
  });

  it("refuses more than 20 pages before reading any text", async () => {
    expect(await extract("pages-21")).toEqual({ ok: false, reason: "too_many_pages" });
  });

  it("refuses text over the analysis limit instead of truncating it", async () => {
    expect(await extract("too-long")).toEqual({ ok: false, reason: "too_long" });
  });

  it("refuses a malformed file", async () => {
    expect(await extract("malformed")).toEqual({ ok: false, reason: "failed" });
  });

  it("refuses a password-protected file", async () => {
    const encrypted: LoadPdfDocument = async () => {
      throw Object.assign(new Error("No password given"), { name: "PasswordException" });
    };
    expect(await extractOfferTextFromPdf(fixture("ar-offer"), encrypted)).toEqual({ ok: false, reason: "encrypted" });
  });
});

describe("rebuildLine", () => {
  const run = (str: string, x: number, width = 5): PdfTextRun => ({ str, x, y: 0, width });

  it("reads Arabic runs right to left and keeps split digits in order", () => {
    // Visual left-to-right: «ريال» «3» «2» «0» «0» «السعر»
    const line = rebuildLine([run("ريال", 0, 20), run(" ", 20), run("3", 25), run("2", 30), run("0", 35), run("0", 40), run(" ", 45), run("السعر", 50, 25)]);
    expect(line).toBe("السعر 3200 ريال");
  });

  it("re-attaches a zero-width diacritic to the letter it sits on", () => {
    // «ليالٍ»: the tanween is a separate zero-width run over «ل».
    const line = rebuildLine([run(" ٍ", 2, 0), run("ل", 0), run("ا", 5), run("ي", 10), run("ل", 15)]);
    expect(line).toBe("ليالٍ");
  });

  it("leaves a left-to-right line untouched", () => {
    expect(rebuildLine([run("Trip", 0, 20), run(" ", 20), run("to", 25, 10), run(" ", 35), run("Dubai", 40, 25)])).toBe("Trip to Dubai");
  });
});

describe("normalizeExtractedText", () => {
  it("folds presentation forms and Persian letters, and tidies whitespace", () => {
    expect(normalizeExtractedText("  ﻻ  ﻳﺸﻤﻞ الطيران\r\n\n\n\nیک  ")).toBe("لا يشمل الطيران\n\nيك");
  });
});
