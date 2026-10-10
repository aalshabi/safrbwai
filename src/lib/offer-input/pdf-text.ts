/**
 * PDF offer text — turns the text layer of a PDF into offer text that the
 * user reviews before analysis (docs/PDF_INPUT_SPEC.md).
 *
 * The PDF is read on the user's device; this module only receives its bytes
 * and returns text or a typed refusal. It never guesses: an image-only page
 * yields no text (no OCR), and text over the analysis limit is refused, never
 * truncated, because a cut could drop an exclusion such as «غير شامل الطيران».
 *
 * Arabic needs reassembly. pdf.js reports text as small glyph runs in VISUAL
 * order (left to right), each run already in logical order. A right-to-left
 * line is therefore rebuilt by reading its runs right to left, while keeping
 * Latin and digit runs ("Grand Hotel", "3200") in their own order. Diacritics
 * arrive as separate zero-width runs and are re-attached to the letter they sit
 * on, and presentation forms are folded back to base letters.
 */

import { OFFER_LIMITS } from "./types";

export const PDF_MAX_PAGES = 20;

export type PdfTextRefusal = "too_many_pages" | "encrypted" | "no_text" | "too_long" | "failed";

export type PdfTextResult =
  | { ok: true; text: string; pages: number }
  | { ok: false; reason: PdfTextRefusal };

/** One positioned text run, as reported by pdf.js `getTextContent`. */
export interface PdfTextRun {
  str: string;
  x: number;
  y: number;
  width: number;
}

/** The slice of the pdf.js document API this module uses. */
export interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: ReadonlyArray<unknown> }>;
  }>;
  destroy?(): Promise<void> | void;
}

export type LoadPdfDocument = (data: Uint8Array) => Promise<PdfDocumentLike>;

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_STRONG = /[A-Za-z0-9À-ɏ]/;
const ONLY_MARKS = /^[ً-ٰٟۖ-ۭ]+$/;
const MIRRORED: Readonly<Record<string, string>> = {
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«",
};

const ROW_TOLERANCE = 2;
const PARAGRAPH_GAP_FACTOR = 1.6;

function countMatching(text: string, pattern: RegExp): number {
  let n = 0;
  for (const ch of text) if (pattern.test(ch)) n++;
  return n;
}

function runKind(run: PdfTextRun): "rtl" | "ltr" | "neutral" {
  if (RTL_CHAR.test(run.str)) return "rtl";
  if (LTR_STRONG.test(run.str)) return "ltr";
  return "neutral";
}

function mirror(text: string): string {
  return [...text].map((ch) => MIRRORED[ch] ?? ch).join("");
}

/** Attach zero-width diacritic runs to the letter run they sit on. */
function attachMarks(runs: PdfTextRun[]): PdfTextRun[] {
  const bases = runs.filter((r) => !ONLY_MARKS.test(r.str.trim()) || r.str.trim() === "");
  const result = bases.map((r) => ({ ...r }));
  for (const run of runs) {
    const mark = run.str.trim();
    if (mark === "" || !ONLY_MARKS.test(mark)) continue;
    let host: PdfTextRun | undefined;
    let best = Number.POSITIVE_INFINITY;
    for (const candidate of result) {
      if (!RTL_CHAR.test(candidate.str)) continue;
      const centre = candidate.x + candidate.width / 2;
      const inside = run.x >= candidate.x - 0.5 && run.x <= candidate.x + candidate.width + 0.5;
      const distance = inside ? 0 : Math.abs(run.x - centre);
      if (distance < best) {
        best = distance;
        host = candidate;
      }
    }
    if (host) host.str += mark;
  }
  return result;
}

/** Rebuild one visual line into logical reading order. */
export function rebuildLine(runs: PdfTextRun[]): string {
  const visual = attachMarks(runs).sort((a, b) => a.x - b.x);
  const text = visual.map((r) => r.str).join("");
  if (countMatching(text, RTL_CHAR) <= countMatching(text, LTR_STRONG)) return text;

  const order = [...visual].reverse();
  const out: string[] = [];
  for (let i = 0; i < order.length; ) {
    const kind = runKind(order[i]);
    if (kind !== "ltr") {
      out.push(kind === "neutral" ? mirror(order[i].str) : order[i].str);
      i++;
      continue;
    }
    // A Latin/digit run (with the neutrals between its strong parts) keeps
    // its left-to-right order inside the right-to-left line.
    let end = i;
    for (let j = i; j < order.length && runKind(order[j]) !== "rtl"; j++) {
      if (runKind(order[j]) === "ltr") end = j;
    }
    out.push(...order.slice(i, end + 1).reverse().map((r) => r.str));
    i = end + 1;
  }
  return out.join("");
}

/**
 * Rebuild a page: group runs into rows, order rows top to bottom, and join
 * soft-wrapped rows of one paragraph with a space. Only a clearly larger
 * vertical gap starts a new line, so a phrase wrapped across two rows
 * («تذاكر» / «الطيران») stays in one clause.
 */
export function rebuildPage(runs: PdfTextRun[]): string {
  const rows: { y: number; runs: PdfTextRun[] }[] = [];
  for (const run of runs) {
    if (run.str === "") continue;
    let row = rows.find((r) => Math.abs(r.y - run.y) < ROW_TOLERANCE);
    if (!row) rows.push((row = { y: run.y, runs: [] }));
    row.runs.push(run);
  }
  rows.sort((a, b) => b.y - a.y);

  // The ordinary line spacing is the lower median gap: with only a few rows, a
  // single heading gap must not be mistaken for the normal spacing.
  const gaps = rows.slice(1).map((row, i) => rows[i].y - row.y).sort((a, b) => a - b);
  const lineGap = gaps.length > 0 ? gaps[Math.floor((gaps.length - 1) / 2)] : 0;

  let text = "";
  rows.forEach((row, i) => {
    if (i > 0) text += rows[i - 1].y - row.y > lineGap * PARAGRAPH_GAP_FACTOR ? "\n" : " ";
    text += rebuildLine(row.runs);
  });
  return text;
}

/**
 * Fold presentation forms to base letters (NFKC), map the Persian yeh/keheh a
 * PDF font may report to their Arabic letters, and tidy whitespace while
 * keeping paragraph breaks.
 */
export function normalizeExtractedText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/ی/g, "ي")
    .replace(/ک/g, "ك")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toRun(item: unknown): PdfTextRun | null {
  if (typeof item !== "object" || item === null) return null;
  const { str, transform, width } = item as { str?: unknown; transform?: unknown; width?: unknown };
  if (typeof str !== "string" || !Array.isArray(transform)) return null;
  const x = Number(transform[4]);
  const y = Number(transform[5]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { str, x, y, width: typeof width === "number" && Number.isFinite(width) ? width : 0 };
}

function isPasswordError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "PasswordException";
}

/** Extract reviewable offer text from PDF bytes, or a typed refusal. */
export async function extractOfferTextFromPdf(data: Uint8Array, load: LoadPdfDocument): Promise<PdfTextResult> {
  let doc: PdfDocumentLike | undefined;
  try {
    doc = await load(data);
    if (doc.numPages > PDF_MAX_PAGES) return { ok: false, reason: "too_many_pages" };

    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      const runs = content.items.map(toRun).filter((r): r is PdfTextRun => r !== null);
      pages.push(rebuildPage(runs));
    }

    const text = normalizeExtractedText(pages.join("\n"));
    if (text.length < OFFER_LIMITS.textMin) return { ok: false, reason: "no_text" };
    if (text.length > OFFER_LIMITS.textMax) return { ok: false, reason: "too_long" };
    return { ok: true, text, pages: doc.numPages };
  } catch (error) {
    return { ok: false, reason: isPasswordError(error) ? "encrypted" : "failed" };
  } finally {
    try {
      await doc?.destroy?.();
    } catch {
      // Releasing a document is best effort.
    }
  }
}
