/**
 * TravelDatesRule — extracts the trip's dates EXACTLY as stated, only when the
 * offer gives a range ("من 8 إلى 15 نوفمبر 2026", "8–15/11/2026", "from 8 to
 * 15 November"). A single date is not enough: it may be an offer deadline
 * ("العرض حتى 30 نوفمبر") rather than when the traveller goes. A range on a
 * line about one stay ("الإقامة الأولى: 8–12 نوفمبر", "Hotel 1 check-in") is
 * that hotel's dates, not the trip's, and a booking-validity range ("العرض
 * ساري من 8 إلى 15 نوفمبر") is not a trip at all; both are skipped. Any other
 * range must show it is the trip's: its line names travel or dates ("تواريخ
 * السفر", "📅", "Travel dates") or holds nothing but the range under a
 * heading that is not about a stay, validity or cancellation, so a
 * cancellation window or other period is never taken for the trip.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

const MONTH =
  "(?:يناير|فبراير|مارس|أبريل|ابريل|إبريل|مايو|يونيو|يونيه|يوليو|يوليه|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|" +
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
/** A day of the month, never part of a longer number ("2026" holds "26"). */
const DAY = "(?<!\\d)(?:[12]\\d|3[01]|0?[1-9])(?!\\d)";
const YEAR = "(?:20\\d{2})";
const TO = "\\s*(?:-|–|—|إلى|الى|حتى|لغاية|to|until|till)\\s*";
const NUMERIC_DATE = `${DAY}[/.-](?:1[0-2]|0?[1-9])(?:[/.-]${YEAR})?(?!\\d)`;

const RANGE = new RegExp(
  [
    // "من 8 إلى 15 نوفمبر 2026", "8 - 15 November", "28 October 2026 - 3 November 2026"
    `(?:(?:من|from)\\s+)?${DAY}(?:\\s+${MONTH}(?:,?\\s+${YEAR})?)?${TO}${DAY}\\s+${MONTH}(?:,?\\s+${YEAR})?`,
    // "November 8 - 15, 2026", "October 28 - November 3, 2026"
    `${MONTH}\\s+${DAY}${TO}(?:${MONTH}\\s+)?${DAY}(?:,?\\s+${YEAR})?`,
    // "من 8/11/2026 إلى 15/11/2026"
    `(?:(?:من|from)\\s+)?${NUMERIC_DATE}${TO}${NUMERIC_DATE}`,
  ].join("|"),
  "giu"
);

const STAY_LINE =
  /(?:إقامة|الإقامة|فندق|الفندق|منتجع|المنتجع|الدخول|الخروج|\bstay\b|\bhotel\b|\bresort\b|check[-\s]?(?:in|out))/iu;

/** When the offer can be booked or cancelled, not when the traveller goes. */
const VALIDITY_LINE =
  /(?:ساري|سارية|صالح|صالحة|صلاحية|العرض\s+(?:من|حتى|لغاية)|الحجز|احجز|إلغاء|الإلغاء|استرداد|\bvalid\b|\bvalidity\b|\bbook(?:ing)?\b|\boffer\s+(?:ends|expires|runs)\b|\bexpires?\b|\bcancel(?:l?ation)?\b|\brefund)/iu;

const TRAVEL_LINE =
  /(?:السفر|الرحلة|تاريخ|تواريخ|المغادرة|الذهاب|العودة|📅|🗓|\btravel\b|\btrip\b|\bdates?\b|\bdepart(?:ure|ing)?\b|\breturn\b)/iu;

/** A line that is only the range, perhaps with an emoji, bullet or «من». */
function onlyRange(line: string, range: string): boolean {
  return line.replace(range, "").replace(/[^\p{L}\p{N}]/gu, "").replace(/^(?:من|from)$/iu, "") === "";
}

function lineAround(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end < 0 ? undefined : end);
}

/** The nearest non-blank line above the one holding `index` (its heading). */
function lineAbove(text: string, index: number): string {
  let end = text.lastIndexOf("\n", index);
  while (end > 0) {
    const start = text.lastIndexOf("\n", end - 1) + 1;
    const line = text.slice(start, end);
    if (line.trim() !== "") return line;
    end = start - 1;
  }
  return "";
}

export const travelDatesRule: ExtractionRule = {
  key: "travelDates",
  apply(text: string): RuleResult {
    const normalized = toWesternDigits(text);
    const m = [...normalized.matchAll(RANGE)].find(
      (match) => {
        const line = lineAround(normalized, match.index ?? 0);
        if (STAY_LINE.test(line) || VALIDITY_LINE.test(line)) return false;
        if (TRAVEL_LINE.test(line)) return true;
        // A bare range takes its meaning from the heading above it
        // ("Hotel 1:", "Free cancellation:").
        if (!onlyRange(line, match[0])) return false;
        const heading = lineAbove(normalized, match.index ?? 0);
        return !STAY_LINE.test(heading) && !VALIDITY_LINE.test(heading);
      }
    );
    if (!m || m.index === undefined) return { facts: {}, warnings: [] };
    const evidence = text.slice(m.index, m.index + m[0].length).trim();
    return { facts: { travelDates: exact(evidence, evidence) }, warnings: [] };
  },
};
