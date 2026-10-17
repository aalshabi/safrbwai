/**
 * TravelDatesRule — extracts the trip's dates EXACTLY as stated, only when the
 * offer gives a range ("من 8 إلى 15 نوفمبر 2026", "8–15/11/2026", "from 8 to
 * 15 November"). A single date is not enough: it may be an offer deadline
 * ("العرض حتى 30 نوفمبر") rather than when the traveller goes.
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
  "iu"
);

export const travelDatesRule: ExtractionRule = {
  key: "travelDates",
  apply(text: string): RuleResult {
    const m = RANGE.exec(toWesternDigits(text));
    if (!m) return { facts: {}, warnings: [] };
    const evidence = text.slice(m.index, m.index + m[0].length).trim();
    return { facts: { travelDates: exact(evidence, evidence) }, warnings: [] };
  },
};
