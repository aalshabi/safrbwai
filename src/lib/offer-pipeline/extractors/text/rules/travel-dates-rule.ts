/**
 * TravelDatesRule — extracts the trip's dates EXACTLY as stated, only when the
 * offer gives a range ("من 8 إلى 15 نوفمبر 2026", "8–15/11/2026", "from 8 to
 * 15 November"). A single date is not enough: it may be an offer deadline
 * ("العرض حتى 30 نوفمبر") rather than when the traveller goes. A range on a
 * line about one stay ("الإقامة الأولى: 8–12 نوفمبر", "Hotel 1 check-in") is
 * that hotel's dates, not the trip's, and a booking-validity range ("العرض
 * ساري من 8 إلى 15 نوفمبر") is not a trip at all; both are skipped.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

const MONTH =
  "(?:يناير|فبراير|مارس|أبريل|ابريل|إبريل|مايو|يونيو|يونيه|يوليو|يوليه|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|" +
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY = "(?:[12]\\d|3[01]|0?[1-9])";
const YEAR = "(?:20\\d{2})";
const TO = "\\s*(?:-|–|—|إلى|الى|حتى|لغاية|to|until|till)\\s*";
const NUMERIC_DATE = `${DAY}[/.-](?:1[0-2]|0?[1-9])(?:[/.-]${YEAR})?`;

const RANGE = new RegExp(
  [
    // "من 8 إلى 15 نوفمبر 2026", "8 - 15 November", "from 8 to 15 Nov 2026"
    `(?:(?:من|from)\\s+)?${DAY}(?:\\s+${MONTH})?${TO}${DAY}\\s+${MONTH}(?:,?\\s+${YEAR})?`,
    // "November 8 - 15, 2026"
    `${MONTH}\\s+${DAY}${TO}${DAY}(?:,?\\s+${YEAR})?`,
    // "من 8/11/2026 إلى 15/11/2026"
    `(?:(?:من|from)\\s+)?${NUMERIC_DATE}${TO}${NUMERIC_DATE}`,
  ].join("|"),
  "giu"
);

const STAY_LINE =
  /(?:إقامة|الإقامة|فندق|الفندق|منتجع|المنتجع|الدخول|الخروج|\bstay\b|\bhotel\b|\bresort\b|check[-\s]?(?:in|out))/iu;

/** When the offer can be booked, not when the traveller goes. */
const VALIDITY_LINE =
  /(?:ساري|سارية|صالح|صالحة|صلاحية|العرض\s+(?:من|حتى|لغاية)|الحجز|احجز|\bvalid\b|\bvalidity\b|\bbook(?:ing)?\b|\boffer\s+(?:ends|expires|runs)\b|\bexpires?\b)/iu;

function lineAround(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end < 0 ? undefined : end);
}

export const travelDatesRule: ExtractionRule = {
  key: "travelDates",
  apply(text: string): RuleResult {
    const normalized = toWesternDigits(text);
    const m = [...normalized.matchAll(RANGE)].find(
      (match) => {
        const line = lineAround(normalized, match.index ?? 0);
        return !STAY_LINE.test(line) && !VALIDITY_LINE.test(line);
      }
    );
    if (!m || m.index === undefined) return { facts: {}, warnings: [] };
    const evidence = text.slice(m.index, m.index + m[0].length).trim();
    return { facts: { travelDates: exact(evidence, evidence) }, warnings: [] };
  },
};
