/**
 * Image offer text — turns OCR output from a screenshot or photo of an offer
 * into text the user reviews before analysis (docs/IMAGE_INPUT_SPEC.md).
 *
 * The image is read on the user's device; this module holds the pure checks.
 * It never guesses: an image without enough readable text, or one the OCR
 * engine reads with low confidence, is refused rather than passed on, and text
 * over the analysis limit is refused, never truncated (a cut could drop an
 * exclusion such as «غير شامل الطيران»).
 */

import { normalizeExtractedText, rebuildLine } from "./pdf-text";
import { OFFER_LIMITS } from "./types";

/** Decoded images above this many pixels are refused before OCR (memory). */
export const IMAGE_MAX_PIXELS = 40_000_000;
/** Longest side the OCR engine receives; larger images are scaled down. */
export const IMAGE_OCR_MAX_SIDE = 3000;
/** Mean OCR word confidence (0–100) below which the text is not offered. */
export const IMAGE_MIN_CONFIDENCE = 45;

export type ImageTextRefusal = "too_large" | "no_text" | "unclear" | "too_long" | "failed";

export type ImageTextResult =
  | { ok: true; text: string; confidence: number }
  | { ok: false; reason: ImageTextRefusal };

export function checkImageDimensions(width: number, height: number): ImageTextRefusal | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return "failed";
  return width * height > IMAGE_MAX_PIXELS ? "too_large" : null;
}

/**
 * Width and height from a PNG, JPEG or WEBP header, without decoding the image,
 * so an image that would decode to hundreds of megapixels is refused before it
 * can exhaust the tab's memory. Null when the header is not recognized.
 */
export function readImageHeaderSize(bytes: Uint8Array): { width: number; height: number } | null {
  const u16be = (i: number) => (bytes[i] << 8) | bytes[i + 1];
  const u32be = (i: number) => ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
  const ascii = (i: number, n: number) => String.fromCharCode(...bytes.subarray(i, i + n));
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(1, 3) === "PNG" && ascii(12, 4) === "IHDR") {
    return { width: u32be(16), height: u32be(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return null;
      const marker = bytes[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      // Start-of-frame markers carry the size (not DHT C4, JPG C8, DAC CC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: u16be(i + 5), width: u16be(i + 7) };
      }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ") return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
    if (chunk === "VP8L") {
      return {
        width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]),
        height: 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      return {
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
  }
  return null;
}

/** Scale factor (≤ 1) that keeps the longest side within IMAGE_OCR_MAX_SIDE. */
export function ocrScale(width: number, height: number): number {
  return Math.min(1, IMAGE_OCR_MAX_SIDE / Math.max(width, height));
}

// Bidi marks the OCR engine inserts around Latin runs; the text is rebuilt in
// logical order, so they only get in the way.
const BIDI_MARKS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;
const ARABIC_LETTER = /[\u0620-\u064a\u066e-\u06d3\u06fa-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufefc]/g;
const LATIN_LETTER = /[A-Za-z\u00c0-\u024f]/g;
const DIGIT = /[0-9\u0660-\u0669\u06f0-\u06f9]/g;

/** One recognized word with its position in the image (pixels). */
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** Confidence an Arabic-only reading needs to correct or complete the main reading. */
const REPLACE_MIN_CONFIDENCE = 60;
const ADD_MIN_CONFIDENCE = 80;
/** A main-reading Arabic word below this is weak enough to be corrected… */
const WEAK_WORD_CONFIDENCE = 60;
/** …by an Arabic-only reading at least this much more confident. */
const WEAK_WORD_MARGIN = 30;

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;
const area = (b: OcrWord["bbox"]) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const overlap = (a: OcrWord["bbox"], b: OcrWord["bbox"]) =>
  area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
/** Share of `b` covered by `a`. */
const coverOf = (a: OcrWord, b: OcrWord) => overlap(a.bbox, b.bbox) / Math.max(1, area(b.bbox));
const sameRow = (a: OcrWord, b: OcrWord) =>
  Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0) >
  0.5 * Math.min(a.bbox.y1 - a.bbox.y0, b.bbox.y1 - b.bbox.y0);

const isLatinWord = (text: string) => count(text, LATIN_LETTER) > 0 && count(text, ARABIC_LETTER) === 0;
function isArabicWord(text: string): boolean {
  const arabic = count(text, ARABIC_LETTER);
  return arabic >= 2 && arabic / (arabic + count(text, LATIN_LETTER) + count(text, DIGIT)) >= 0.8;
}

/** Clean the engine's words: drop bidi marks and empty words. */
export function cleanOcrWords(words: readonly OcrWord[]): OcrWord[] {
  return words
    .map((w) => ({ ...w, text: w.text.replace(BIDI_MARKS, "").trim() }))
    .filter((w) => w.text.length > 0);
}

/** More Arabic letters than Latin ones across the image. */
export function isMostlyArabic(words: readonly OcrWord[]): boolean {
  const text = words.map((w) => w.text).join(" ");
  return count(text, ARABIC_LETTER) > count(text, LATIN_LETTER);
}

/**
 * Combine the Arabic+English reading (`primary`) with an Arabic-only reading of
 * the same image. Reading both scripts at once, the engine can take an Arabic
 * word beside Latin text for a Latin one («ليالٍ» → «Ju») or skip a short
 * line; the Arabic-only reading gets those right but garbles Latin names.
 * So, by position: a Latin word on a line with Arabic is replaced by the
 * Arabic-only words it covers when those are confidently Arabic; a weakly read
 * Arabic word («تير» for «-غير») is replaced when the Arabic-only reading of
 * that spot is far more confident; and a confident Arabic word the primary
 * reading missed is added. Everything else is the primary reading. True Latin
 * names survive because the Arabic-only reading turns them into digits or
 * mixed scripts, which never count as Arabic words. Use only for a mostly
 * Arabic image.
 */
export function mergeOcrPasses(primary: readonly OcrWord[], arabic: readonly OcrWord[]): OcrWord[] {
  const merged: OcrWord[] = [];
  for (const word of primary) {
    const covered = arabic.filter((a) => coverOf(word, a) >= 0.5);
    const latinMisread =
      isLatinWord(word.text) &&
      primary.some((other) => other !== word && sameRow(other, word) && count(other.text, ARABIC_LETTER) > 0) &&
      covered.length > 0 &&
      covered.every((a) => isArabicWord(a.text) && a.confidence >= REPLACE_MIN_CONFIDENCE);
    const weakArabic =
      count(word.text, ARABIC_LETTER) > 0 &&
      word.confidence < WEAK_WORD_CONFIDENCE &&
      covered.length > 0 &&
      covered.every(
        (a) => isArabicWord(a.text) && a.confidence >= ADD_MIN_CONFIDENCE && a.confidence - word.confidence >= WEAK_WORD_MARGIN
      );
    merged.push(...(latinMisread || weakArabic ? covered : [word]));
  }
  for (const a of arabic) {
    if (!isArabicWord(a.text) || a.confidence < ADD_MIN_CONFIDENCE) continue;
    if (primary.some((word) => coverOf(word, a) >= 0.2)) continue;
    merged.push(a);
  }
  return merged;
}

/**
 * Lay words out as text: rows top to bottom, each row in logical order. In a
 * mostly Arabic image every row with Arabic in it reads right to left, with
 * Latin runs (hotel names, "Breakfast included") kept in their own order.
 */
export function layoutOcrWords(words: readonly OcrWord[]): string {
  const rtlDocument = isMostlyArabic(words);
  const rows: { y0: number; y1: number; words: OcrWord[] }[] = [];
  for (const word of [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0)) {
    const centre = (word.bbox.y0 + word.bbox.y1) / 2;
    let row = rows.find((r) => centre >= r.y0 && centre <= r.y1);
    if (!row) rows.push((row = { y0: word.bbox.y0, y1: word.bbox.y1, words: [] }));
    row.words.push(word);
  }
  return rows
    .sort((a, b) => a.y0 - b.y0)
    .map((row) => {
      const text = row.words.map((w) => w.text).join(" ");
      const arabic = count(text, ARABIC_LETTER);
      const rtl = arabic > 0 && (rtlDocument || arabic > count(text, LATIN_LETTER));
      const runs = row.words.map((w) => ({ str: `${w.text} `, x: w.bbox.x0, y: 0, width: w.bbox.x1 - w.bbox.x0 }));
      return rebuildLine(runs, rtl ? "rtl" : "ltr").replace(/ {2,}/g, " ").trim();
    })
    .join("\n");
}

/**
 * Repair the OCR slips that would invert an exclusion. The engine sometimes
 * reads the lam-alef ligature as «لاا», drops the space after a negation
 * («لاتشمل», «ولايشمل», «غيرشامل») or glues a list marker to it («-غير»);
 * the analysis would then miss the negation and report flights or taxes as
 * included. Only these patterns are touched (a negation, optionally with the
 * conjunction و/ف, at the start of a word), so words such as «لايت», «لايف» or
 * «بلاتشمل» are left alone.
 */
export function repairOcrNegations(text: string): string {
  return (
    text
      // «لاا» as a whole word (optionally «ولاا»/«فلاا») → «لا».
      .replace(/(?<!\p{L})([وف]?)لاا(?!\p{L})/gu, "$1لا")
      // «لاتشمل», «لايشمل», «لاتتضمن», «لايتضمن» (also after و/ف) → add the space.
      .replace(/(?<!\p{L})([وف]?)لا(?=[يت](?:شمل|تضمن)|تشمل)/gu, "$1لا ")
      // «غيرشامل», «ليسشامل», «غيرمتضمن», «غيرمشمول» → add the space.
      .replace(/(?<!\p{L})([وف]?)(غير|ليس)(?=شامل|متضمن|مشمول)/gu, "$1$2 ")
      // A list marker or number glued to a negation («-غير شامل», «1-لا يشمل»).
      .replace(/([-–—•*·)\d])(?=[وف]?(?:لا|غير|ليس) )/gu, "$1 ")
  );
}

/** Validate and normalize the OCR engine's text and mean confidence. */
export function finalizeOcrText(raw: string, confidence: number): ImageTextResult {
  const text = repairOcrNegations(normalizeExtractedText(raw.replace(BIDI_MARKS, "")))
    // A list bullet is often read as a lone Arabic-Indic zero at the line start.
    .replace(/^[٠۰](?= )/gm, "•");
  if (text.replace(/\s/g, "").length < OFFER_LIMITS.textMin) return { ok: false, reason: "no_text" };
  if (!Number.isFinite(confidence) || confidence < IMAGE_MIN_CONFIDENCE) return { ok: false, reason: "unclear" };
  if (text.length > OFFER_LIMITS.textMax) return { ok: false, reason: "too_long" };
  return { ok: true, text, confidence: Math.round(confidence) };
}
