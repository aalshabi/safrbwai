/**
 * TravellersRule — extracts explicitly stated adults and/or children.
 *
 * Two accepted forms, both explicit (nothing is inferred):
 *  1. a NUMBER next to a traveller word ("2 بالغين", "3 أطفال", "2 adults").
 *  2. the Arabic DUAL/singular person forms that carry the count in the word
 *     itself ("لشخصين" = 2, "لشخص واحد" = 1) — unambiguous by construction.
 *
 * A lone `children: 0` is NOT a useful fact (it states an absence and would be
 * rendered as a confirmed "أطفال: ٠"), so it is only kept when an adult count
 * was found alongside it.
 */

import type { OfferTravelers } from "@/lib/offer-pipeline/types";
import type { ExtractionRule, RuleResult } from "../rule";
import { CURRENCY } from "../signals";
import { exact, toWesternDigits } from "../utils";

// A count right after a price ("12,100 ريال لـ4 أشخاص", "12,100 ريال سعودي
// لـ4 أشخاص", "SAR 12,100 for 4 persons") is a price tier, not the party; «عرض لـ 4
// بالغين» still is. A count never starts inside a longer number, so «لـ14
// أشخاص» cannot be re-read as «4 أشخاص».
const ADULTS = new RegExp(
  `(?<!(?:(?:${CURRENCY})(?:\\s*(?:سعودي|أمريكي|إماراتي|saudi|us))?|(?:${CURRENCY})\\s*[\\d,.]+)\\s*(?:لـ|ل|for)\\s*)` +
    "(?<!\\d)(\\d{1,2})\\s*(?:بالغ(?:ين|ون)?|كبار|راشد(?:ين)?|أشخاص|شخص|adults?|persons?|pax)",
  "i"
);
const CHILDREN = /(?<!\d)(\d{1,2})\s*(?:أطفال|طفل|رضيع|children|child|kids?|infants?)/i;

/** Arabic dual/singular person words whose count is inherent in the word. */
const PERSON_WORD: { pattern: RegExp; adults: number }[] = [
  { pattern: /(?:شخصين|فردين|بالغين اثنين|مسافرين اثنين|زوجين)/, adults: 2 },
  { pattern: /(?:شخص واحد|فرد واحد|مسافر واحد)/, adults: 1 },
];

export const travellersRule: ExtractionRule = {
  key: "travelers",
  apply(text: string): RuleResult {
    const norm = toWesternDigits(text);

    const adultsM = ADULTS.exec(norm);
    const childrenM = CHILDREN.exec(norm);
    const wordM = adultsM
      ? null
      : PERSON_WORD.map((p) => ({ m: p.pattern.exec(norm), adults: p.adults })).find((r) => r.m !== null) ?? null;

    if (!adultsM && !childrenM && !wordM) return { facts: {}, warnings: [] };

    const value: OfferTravelers = {};
    const evidenceParts: string[] = [];

    if (adultsM) {
      const adults = Number(adultsM[1]);
      if (Number.isInteger(adults) && adults > 0) {
        value.adults = adults;
        evidenceParts.push(text.slice(adultsM.index, adultsM.index + adultsM[0].length));
      }
    } else if (wordM?.m) {
      value.adults = wordM.adults;
      evidenceParts.push(text.slice(wordM.m.index, wordM.m.index + wordM.m[0].length));
    }

    if (childrenM) {
      const children = Number(childrenM[1]);
      // Keep an explicit zero ONLY when it qualifies a known adult count.
      if (Number.isInteger(children) && (children > 0 || value.adults !== undefined)) {
        value.children = children;
        evidenceParts.push(text.slice(childrenM.index, childrenM.index + childrenM[0].length));
      }
    }

    if (value.adults === undefined && value.children === undefined) return { facts: {}, warnings: [] };

    return { facts: { travelers: exact(value, evidenceParts.join(" | ")) }, warnings: [] };
  },
};
