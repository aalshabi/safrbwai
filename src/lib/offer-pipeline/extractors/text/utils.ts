/**
 * Shared, pure helpers for the text extraction rules.
 *
 * These are intrinsic to *extraction* (parsing a number, locating a currency
 * token, slicing the evidence span) — they are NOT the pipeline's Normalization
 * stage. Everything here is deterministic and side-effect free.
 */

import type { Fact } from "@/lib/offer-pipeline/types";

// Canonical digit conversion lives in one place; re-exported for the rules.
export { toWesternDigits } from "@/lib/offer-pipeline/digits";

/** Build an "exact"-confidence fact. This phase never emits "inferred". */
export function exact<T>(value: T, evidence: string): Fact<T> {
  return { value, evidence, confidenceType: "exact" };
}

/**
 * Parse a numeric amount token (already Western digits) into a positive number,
 * or null when it is ambiguous/invalid. Grouped thousands (1-3 digits followed
 * by groups of exactly 3) are treated as separators; a trailing `.`/`,` with 1-2
 * digits is a decimal. Anything else is rejected to stay exact.
 */
export function parseAmount(rawWestern: string): number | null {
  const token = rawWestern.replace(/\s/g, "");
  // Grouped thousands: 1,234  1.234.567  1٬234 — separators are grouping.
  if (/^\d{1,3}([.,٬']\d{3})+$/.test(token)) {
    return toNumber(token.replace(/[.,٬']/g, ""));
  }
  // Grouped thousands with decimals: 6,617.60 (comma groups, dot decimal) or
  // 6.617,60 (dot groups, comma decimal) — the last separator is the decimal.
  if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(token)) {
    return toNumber(token.replace(/,/g, ""));
  }
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(token)) {
    return toNumber(token.replace(/\./g, "").replace(",", "."));
  }
  // Decimal: 3200.50  3200,5
  if (/^\d+[.,]\d{1,2}$/.test(token)) {
    return toNumber(token.replace(",", "."));
  }
  // Plain integer.
  if (/^\d+$/.test(token)) {
    return toNumber(token);
  }
  return null;
}

function toNumber(s: string): number | null {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---- currency detection ----------------------------------------------------

export interface CurrencyHit {
  code: string;
  /** The exact token as written (for evidence). */
  token: string;
  index: number;
}

/**
 * Per-family currency patterns. Latin codes use lookarounds so they do not
 * match inside unrelated words (e.g. "SR" inside "MRS"). Arabic tokens and
 * symbols are matched directly.
 */
// Note: the SAR/AED short forms REQUIRE the separating dot (ر.س / د.إ) so they
// never match bare letter pairs inside ordinary words (e.g. "الرسوم").
const CURRENCY_FAMILIES: { code: string; re: RegExp }[] = [
  { code: "SAR", re: /ريال|﷼|ر\s?\.\s?س\.?|(?<![A-Za-z])(?:SAR|SR)(?![A-Za-z])/gi },
  { code: "USD", re: /دولار|\$|(?<![A-Za-z])(?:USD)(?![A-Za-z])/gi },
  { code: "AED", re: /درهم|د\s?\.\s?إ|(?<![A-Za-z])(?:AED)(?![A-Za-z])/gi },
  { code: "EUR", re: /يورو|€|(?<![A-Za-z])(?:EUR)(?![A-Za-z])/gi },
];

/** All currency families that appear in the text, with the first hit of each. */
export function detectCurrencies(text: string): CurrencyHit[] {
  const hits: CurrencyHit[] = [];
  for (const { code, re } of CURRENCY_FAMILIES) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) hits.push({ code, token: m[0], index: m.index });
  }
  return hits.sort((a, b) => a.index - b.index);
}

/** Canonical currency code for a single matched token, or null. */
export function tokenToCurrencyCode(token: string): string | null {
  for (const { code, re } of CURRENCY_FAMILIES) {
    re.lastIndex = 0;
    if (re.test(token)) return code;
  }
  return null;
}

/**
 * A raw amount token pattern (Western digits): grouped thousands with or
 * without decimals ("6,617.60", "6.617,60"), or plain/decimal. Longest forms
 * first, so "6,617.60" is never read as "617.60".
 */
export const AMOUNT_PATTERN = String.raw`\d{1,3}(?:,\d{3})+\.\d{1,2}(?!\d)|\d{1,3}(?:\.\d{3})+,\d{1,2}(?!\d)|\d{1,3}(?:[.,٬']\d{3})+|\d+(?:\.\d{1,2})?`;

/** Alternation of every currency token, for adjacency matching in PriceRule. */
export const CURRENCY_ALT = String.raw`ريال|﷼|ر\s?\.\s?س\.?|درهم|د\s?\.\s?إ|دولار|يورو|€|\$|(?<![A-Za-z])(?:SAR|SR|USD|AED|EUR)(?![A-Za-z])`;
