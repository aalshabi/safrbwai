/**
 * The OCR reading sequence, shared by the browser reader and the corpus tests:
 * an Arabic+English pass, then, for a mostly Arabic image, an Arabic-only pass
 * in sparse-text mode merged in by position (see mergeOcrPasses). No browser
 * APIs here: the caller supplies the engine worker and the image.
 */

import {
  cleanOcrWords,
  finalizeOcrText,
  isMostlyArabic,
  layoutOcrWords,
  mergeOcrPasses,
  type ImageTextResult,
  type OcrWord,
} from "./image-text";

/** Tesseract OEM.LSTM_ONLY. */
export const OCR_OEM_LSTM_ONLY = 1;
export const OCR_LANGS = ["ara", "eng"] as const;

export interface OcrPage {
  confidence: number;
  blocks: { paragraphs: { lines: { words: OcrWord[] }[] }[] }[] | null;
}

/** The slice of a tesseract.js worker the sequence uses. */
export interface OcrEngine {
  recognize(image: never, options: object, output: { blocks: true }): Promise<{ data: OcrPage }>;
  reinitialize(langs: string[], oem: number): Promise<unknown>;
  setParameters(params: Record<string, string>): Promise<unknown>;
}

const wordsOf = (page: OcrPage): OcrWord[] =>
  cleanOcrWords((page.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words))));

/**
 * Read an image with an engine already initialized for OCR_LANGS. `stopped`
 * lets the caller abandon the second pass after a time limit.
 */
export async function readOfferWithEngine<I>(
  engine: OcrEngine,
  image: I,
  stopped: () => boolean = () => false
): Promise<ImageTextResult> {
  const recognize = (img: I) => engine.recognize(img as never, {}, { blocks: true });
  const { data } = await recognize(image);
  let words = wordsOf(data);
  if (isMostlyArabic(words) && !stopped()) {
    await engine.reinitialize(["ara"], OCR_OEM_LSTM_ONLY);
    // Sparse-text mode finds short lines the full-page layout skips. A fixed
    // resolution avoids the engine's "Estimating resolution" console message.
    await engine.setParameters({ tessedit_pageseg_mode: "11", user_defined_dpi: "300" });
    const arabic = await recognize(image);
    words = mergeOcrPasses(words, wordsOf(arabic.data));
  }
  return finalizeOcrText(layoutOcrWords(words), data.confidence);
}
