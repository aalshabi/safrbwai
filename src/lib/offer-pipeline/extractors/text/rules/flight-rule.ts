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
import { detectInclusion, listedAsIncluded } from "../signals";
import { exact } from "../utils";

/**
 * The words an offer uses for the air ticket itself.
 *
 * «تذاكر» alone is NOT one of them: an offer also sells museum, event and train
 * tickets, and reading «يشمل تذاكر المتحف» as "flight included" would be a
 * materially false claim about airfare. A generic ticket noun therefore counts
 * only when an aviation word qualifies it.
 */
const FLIGHT_NOUN =
  "الطيران|طيران|الرحلة\\s*الجوية|رحلة\\s*جوية|(?:التذاكر|تذاكر|التذكرة|تذكرة)\\s*(?:ال)?(?:طيران|جوية|الجوية)";

/**
 * A domestic flight («الطيران الداخلي», "domestic flights") is a leg inside the
 * destination, not the trip's air ticket, so it never answers "is the flight
 * included" — reading it that way would overstate what the price covers.
 */
const FLIGHT_WORD = `(?:${FLIGHT_NOUN})(?!\\s*(?:ال)?داخلي)`;
// A route qualifier may sit between ("domestic connecting flights").
const EN_FLIGHT = "(?<!(?:domestic|internal)(?:\\s+[a-z-]+){0,2}\\s)(?:flights?|airfare|air\\s*tickets?)";

/**
 * After «مع» only a definite flight noun is an inclusion ("مع الطيران",
 * "مع تذاكر الطيران"). An indefinite «طيران X» is a carrier name, and a
 * definite noun followed by a nisba adjective («الطيران العماني») is one too.
 *
 * A few ordinary ticket qualifiers («الدولي», «الاقتصادي», «السياحي»,
 * «العادي») share that ending and are let through. The list is of qualifiers,
 * not carriers, on purpose: carrier nationalities are open-ended, and missing
 * one would wrongly say "included", whereas a missing qualifier only leaves
 * the inclusion unknown. «الداخلي» stays out: a domestic leg is not the trip's
 * ticket.
 */
const WITH_FLIGHT =
  "(?:الطيران|تذاكر\\s*الطيران|التذاكر\\s*الجوية|الرحلة\\s*الجوية)" +
  "(?!\\s*(?!(?:الدولي|الاقتصادي|السياحي|العادي)(?![\\p{L}]))ال[\\p{L}]*ي(?![\\p{L}]))";

const EXCLUDE = new RegExp(
  `(?:${FLIGHT_WORD})[^.،\\n]{0,20}?(?:غير\\s*مشمول|غير\\s*شامل|غير\\s*مشمولة|not\\s*included|excluded)` +
    `|بدون\\s*(?:${FLIGHT_WORD})` +
    `|${EN_FLIGHT}[^.،\\n]{0,20}?(?:not\\s*included|excluded)` +
    `|(?:excluding|without)\\s*(?:flights?|airfare)` +
    `|land\\s*only`,
  "i"
);

const INCLUDE = new RegExp(
  // "شامل الطيران"، "يشمل تذاكر الطيران"
  `(?:شامل|شاملة|يشمل|تشمل)\\s*(?:${FLIGHT_WORD})` +
    // "شامل الإفطار وتذاكر الطيران" — the ticket as a later item of the same
    // inclusion list. Only the definite noun counts here, as after «مع», and a
    // comma ends the list so a later clause cannot borrow the inclusion verb.
    `|(?:شامل|شاملة|يشمل|تشمل)\\s[^.،,\\n]{1,30}?\\sو\\s*${WITH_FLIGHT}` +
    // "مع الطيران" — but «مع طيران ناس» / «مع الطيران العماني» name the carrier
    // the traveller flies with; they do not say the ticket is in the price.
    `|مع\\s*${WITH_FLIGHT}` +
    // "الطيران مشمول"، "التذاكر مشمولة"
    `|(?:${FLIGHT_WORD})\\s*(?:مشمول|مشمولة|شامل|شاملة)` +
    // "تذاكر طيران ذهاب وعودة" — stating the trip shape asserts the ticket is in the offer.
    `|(?:${FLIGHT_WORD})[^.،\\n]{0,15}?(?:ذهاب\\s*و\\s*(?:عودة|إياب)|ذهاب\\s*فقط)` +
    `|(?:round[\\s-]?trip|one[\\s-]?way|return)\\s*(?:flights?|air\\s*)?tickets?` +
    `|${EN_FLIGHT}[^.\\n]{0,20}?included` +
    `|includes?\\s*(?:return\\s*|round[\\s-]?trip\\s*)?${EN_FLIGHT}`,
  "iu"
);

// Broader than FLIGHT_WORD on purpose: a domestic flight is still a mention, so
// it yields the "inclusion not stated" warning instead of silence.
const MENTION = new RegExp(`${FLIGHT_NOUN}|flights?|airfare`, "i");

/**
 * Add-ons sold with a flight. An item about one is not the ticket: the add-on
 * comes first («ترقية مقعد الطيران») or names the flight's own extra right
 * after it ("Flight upgrades"). A ticket that details an add-on ("Flights with
 * 20 kg baggage", «تذاكر الطيران مع أمتعة 20 كجم») is still the ticket.
 */
const FLIGHT_ADDON = "upgrades?|ترقية|seats?|مقعد|مقاعد|meals?|وجبة|وجبات|baggage|luggage|أمتعة|حقائب|lounge|صالة";

/**
 * The trip's ticket as an item of an included or excluded list ("### Included\n-
 * Flights"). A domestic leg is not it either way: excluding «الطيران الداخلي»
 * says nothing about the international ticket.
 */
const LISTED_FLIGHT = new RegExp(
  `(?<!(?:${FLIGHT_ADDON})[^\\n]*)(?:${FLIGHT_WORD}|${EN_FLIGHT})(?!\\s*(?:${FLIGHT_ADDON}))`,
  "iu"
);

export const flightRule: ExtractionRule = {
  key: "flight",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE, LISTED_FLIGHT) ?? listedAsIncluded(text, LISTED_FLIGHT);
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
