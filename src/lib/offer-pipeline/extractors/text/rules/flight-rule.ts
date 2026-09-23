/**
 * FlightRule — extracts whether air tickets are included in the offer.
 *
 * `ExtractedOfferFacts.flight` existed in the model with no rule producing it,
 * so an offer stating "تذاكر طيران ذهاب وعودة" yielded nothing. Mirrors
 * transfersRule: explicit negation → false, an explicitly provided ticket →
 * true, and a bare mention with no stated status → a warning, never a guess.
 *
 * Flight is NOT added to the field registry: it is neither required nor
 * recommended for every offer, so it is surfaced as a confirmed fact when the
 * offer states it and is otherwise silent.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion } from "../signals";
import { exact } from "../utils";

/**
 * The words an offer uses for the air ticket itself.
 *
 * «تذاكر» alone is NOT one of them: an offer also sells museum, event and train
 * tickets, and reading «يشمل تذاكر المتحف» as "flight included" would be a
 * materially false claim about airfare. A generic ticket noun therefore counts
 * only when an aviation word qualifies it.
 */
const FLIGHT_WORD =
  "الطيران|طيران|الرحلة\\s*الجوية|رحلة\\s*جوية|(?:التذاكر|تذاكر|التذكرة|تذكرة)\\s*(?:ال)?(?:طيران|جوية|الجوية)";

const EXCLUDE = new RegExp(
  `(?:${FLIGHT_WORD})[^.،\\n]{0,20}?(?:غير\\s*مشمول|غير\\s*شامل|غير\\s*مشمولة|not\\s*included|excluded)` +
    `|بدون\\s*(?:${FLIGHT_WORD})` +
    `|(?:flights?|airfare|air\\s*tickets?)[^.،\\n]{0,20}?(?:not\\s*included|excluded)` +
    `|(?:excluding|without)\\s*(?:flights?|airfare)` +
    `|land\\s*only`,
  "i"
);

const INCLUDE = new RegExp(
  // "شامل الطيران"، "يشمل تذاكر الطيران"، "مع الطيران"
  `(?:شامل|شاملة|يشمل|تشمل|مع)\\s*(?:${FLIGHT_WORD})` +
    // "الطيران مشمول"، "التذاكر مشمولة"
    `|(?:${FLIGHT_WORD})\\s*(?:مشمول|مشمولة|شامل|شاملة)` +
    // "تذاكر طيران ذهاب وعودة" — stating the trip shape asserts the ticket is in the offer.
    `|(?:${FLIGHT_WORD})[^.،\\n]{0,15}?(?:ذهاب\\s*و\\s*(?:عودة|إياب)|ذهاب\\s*فقط)` +
    `|(?:round[\\s-]?trip|one[\\s-]?way|return)\\s*(?:flights?|air\\s*)?tickets?` +
    `|(?:flights?|airfare|air\\s*tickets?)[^.\\n]{0,20}?included` +
    `|includes?\\s*(?:return\\s*|round[\\s-]?trip\\s*)?(?:flights?|airfare|air\\s*tickets?)`,
  "i"
);

const MENTION = new RegExp(`${FLIGHT_WORD}|flights?|airfare`, "i");

export const flightRule: ExtractionRule = {
  key: "flight",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE);
    if (hit) return { facts: { flight: exact({ included: hit.value }, hit.evidence) }, warnings: [] };

    if (MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكر الطيران دون توضيح إن كان مشمولًا، فلم تُستخرج حقيقة.",
            en: "The flight was mentioned without stating inclusion; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
