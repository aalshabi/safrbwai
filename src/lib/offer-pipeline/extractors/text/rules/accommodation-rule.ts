/**
 * AccommodationRule — extracts the accommodation CATEGORY as stated
 * ("فندق ٥ نجوم", "شقة فندقية", "4-star hotel", "resort").
 *
 * It deliberately never captures a hotel NAME: proper-noun capture from free
 * text is not reliable enough to be an "exact" fact, and a wrong hotel name is
 * worse than an absent one. A bare "فندق" with no category yields a warning so
 * the user is told the name/category still needs confirming.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

const CATEGORY =
  /(?:فندق|منتجع|نزل)\s*(?:فئة\s*)?[1-7]\s*نجوم|[1-7]\s*نجوم|شق(?:ة|ق)\s*فندقية|منتجع|resort|[1-7][-\s]?star\s*(?:hotel|resort)?|aparthotel|serviced\s*apartment|فيلا\s*(?:مائية|فوق\s*الماء|على\s*الماء|شاطئية)|(?:water|overwater|over-water|beach)\s*(?:villa|bungalow)/i;

const BARE_MENTION = /فندق|إقامة|hotel|accommodation|stay/i;

export const accommodationRule: ExtractionRule = {
  key: "accommodation",
  apply(text: string): RuleResult {
    // Match on western-digit form so "٥ نجوم" is recognized, then slice the
    // ORIGINAL text at the same offsets to keep evidence verbatim.
    const norm = toWesternDigits(text);
    const m = CATEGORY.exec(norm);

    if (m) {
      const evidence = text.slice(m.index, m.index + m[0].length).trim();
      if (evidence) return { facts: { accommodation: exact(evidence, evidence) }, warnings: [] };
    }

    if (BARE_MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكرت الإقامة دون فئة واضحة (نجوم/نوع)، فلم تُستخرج حقيقة.",
            en: "Accommodation was mentioned without a clear category; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
