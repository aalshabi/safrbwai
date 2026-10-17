// @vitest-environment node
/**
 * Runs the real OCR engine (tesseract.js in Node, local models, no network)
 * over committed offer screenshots and checks that the text reads back
 * correctly and, above all, that its analysis matches the analysis of the
 * original text: an OCR slip must never turn "not included" into "included".
 */

import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWorker } from "tesseract.js";
import { runOfferPipeline } from "@/lib/offer-pipeline/pipeline";
import { repairOcrNegations } from "./image-text";
import { OCR_LANGS, OCR_OEM_LSTM_ONLY, readOfferWithEngine, type OcrEngine } from "./ocr-passes";

const FIXTURES = join(__dirname, "__fixtures__", "image");
const corpus = JSON.parse(readFileSync(join(FIXTURES, "corpus.json"), "utf8")) as Record<
  string,
  { file: string; source: string; mustContain: string[] }
>;
const require_ = createRequire(import.meta.url);

let langDir: string;
let worker: Awaited<ReturnType<typeof createWorker>>;

beforeAll(async () => {
  langDir = mkdtempSync(join(tmpdir(), "ocr-lang-"));
  for (const lang of OCR_LANGS) {
    const pkg = dirname(require_.resolve(`@tesseract.js-data/${lang}/package.json`));
    copyFileSync(join(pkg, "4.0.0_best_int", `${lang}.traineddata.gz`), join(langDir, `${lang}.traineddata.gz`));
  }
  worker = await createWorker([...OCR_LANGS], OCR_OEM_LSTM_ONLY, { langPath: langDir, gzip: true, cacheMethod: "none" });
}, 60_000);

afterAll(async () => {
  await worker?.terminate();
  rmSync(langDir, { recursive: true, force: true });
});

const flat = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim();

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = next;
    }
  }
  return row[b.length];
}

async function facts(text: string) {
  const outcome = await runOfferPipeline({ type: "text", text });
  if (outcome.status !== "ok") return {};
  return Object.fromEntries(
    Object.entries(outcome.extraction.facts).map(([k, v]) => [k, JSON.stringify((v as { value?: unknown } | undefined)?.value ?? v)])
  );
}

describe("OCR of offer screenshots (real engine)", () => {
  it.each(Object.entries(corpus))("%s reads back with the same analysis facts", async (_name, { file, source, mustContain }) => {
    // Each image starts from the Arabic+English engine state.
    const engine = worker as unknown as OcrEngine;
    await engine.reinitialize([...OCR_LANGS], OCR_OEM_LSTM_ONLY);
    await engine.setParameters({ tessedit_pageseg_mode: "3" });
    const result = await readOfferWithEngine(engine, join(FIXTURES, file));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Negations are checked word for word: the facts below cannot see every
    // exclusion (e.g. «ولا تذاكر الطيران» in a paragraph the rules skip).
    for (const phrase of mustContain) expect(flat(result.text)).toContain(phrase);
    const errorRate = editDistance(flat(result.text), flat(source)) / flat(source).length;
    expect(errorRate).toBeLessThan(0.12);
    // The reference is the source after the same negation repair: a hyphen glued
    // to «غير» («-غير شامل») trips the text rules even in typed text, and the
    // repaired reading is the true meaning.
    expect(await facts(result.text)).toEqual(await facts(repairOcrNegations(source)));
  }, 60_000);
});
