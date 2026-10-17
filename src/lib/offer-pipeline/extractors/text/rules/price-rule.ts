/**
 * PriceRule — extracts a monetary amount that is directly adjacent to a
 * currency token (either order), yielding a complete `price` fact. A bare
 * number with no adjacent currency is intentionally NOT extracted (ambiguous).
 */

import type { ExtractedOfferFacts, OfferPrice, OfferPriceBasis } from "@/lib/offer-pipeline/types";
import type { OfferObservations } from "@/lib/offer-pipeline/analysis/types";
import type { ExtractionRule, RuleResult } from "../rule";
import {
  AMOUNT_PATTERN,
  CURRENCY_ALT,
  exact,
  parseAmount,
  toWesternDigits,
  tokenToCurrencyCode,
} from "../utils";

const AMOUNT_THEN_CURRENCY = new RegExp(`(${AMOUNT_PATTERN})\\s*(${CURRENCY_ALT})`, "gi");
const CURRENCY_THEN_AMOUNT = new RegExp(`(${CURRENCY_ALT})\\s*(${AMOUNT_PATTERN})`, "gi");
/**
 * An Arabic letter right after a word, even past its harakat, means the word
 * continues ("للشخص|ين", "للشخصَ|ين").
 */
const ARABIC_WORD_END = "(?![\\u064B-\\u0652]*[\\u0621-\\u064A])";
const PARTY_NOUN_EN = "people|persons?|adults?|travell?ers|guests|pax";
/**
 * The party a price is stated for — "للشخصين", "لـ 2 أشخاص", "for two people".
 * Only unambiguous counts: the Arabic dual «شخصين/فردين» (their plural is
 * أشخاص/أفراد), or an explicit number. «للمسافرين/للبالغين» alone can be
 * plural, so it needs «اثنين». English always needs a person noun: "for both"
 * or "for two" alone may count rooms, weeks or components.
 */
const PARTY_ALT =
  `ل?ل(?:شخصين|فردين)(?:\\s+اثنين)?${ARABIC_WORD_END}` +
  `|ل?ل(?:مسافرين|بالغين)\\s+اثنين${ARABIC_WORD_END}` +
  `|لـ?\\s*\\d{1,2}\\s*(?:أشخاص|اشخاص|شخص|أفراد|افراد|فرد|بالغين|مسافرين)${ARABIC_WORD_END}` +
  `|\\bfor\\s+(?:both|one|two|three|four|five|six|\\d{1,2})\\s+(?:${PARTY_NOUN_EN})\\b`;
const LABEL_END = "\\s*(?:هو|is)?\\s*[:：\\-–—]?\\s*$";
/** What a whole-trip total is named for ("إجمالي مبلغ الرحلة", "إجمالي الباقة"). */
const TRIP_WORD = "(?:ال)?(?:رحلة|باقة|عرض|برنامج)";
const TOTAL_PRICE_LABEL = new RegExp(
  `(?:السعر\\s+(?:النهائي|الإجمالي)|(?:و?ال)?(?:إجمالي|مجموع)\\s+(?:(?:مبلغ|سعر|تكلفة)\\s+)?${TRIP_WORD}|(?:المبلغ|الإجمالي)\\s+(?:الإجمالي|النهائي|الكلي|العام)|التكلفة\\s+(?:الإجمالية|النهائية)|(?:و?ال)?(?:إجمالي|مجموع)(?:\\s+السعر)?|\\b(?:final|total)\\s+(?:price|cost)\\b|\\bgrand\\s+total\\b|\\btotal\\b)(?:\\s+(?:${PARTY_ALT}))?${LABEL_END}`,
  "i"
);
/**
 * A bare price word stated for a whole party ("السعر للشخصين", "price for two
 * people") is that party's total, not a per-person rate.
 */
const PARTY_PRICE_LABEL = new RegExp(
  `(?:السعر|سعر|التكلفة|تكلفة|المبلغ|\\b(?:the\\s+)?(?:price|cost))\\s+(?:${PARTY_ALT})${LABEL_END}`,
  "i"
);
const PARTY_AT_LABEL_END = new RegExp(`(${PARTY_ALT})${LABEL_END}`, "i");
/** A party suffix right after the amount ("3,800 ريال للشخصين"). */
const PARTY_QUALIFIER = new RegExp(`^\\s*(?:${PARTY_ALT})`, "i");
/** After a party suffix the clause ends, so the party is the whole group. */
const PARTY_CLAUSE_END = /^\s*(?:$|[،,؛;.!?\n)])/;
/** After a party suffix more people follow ("للشخصين مع طفل", "2 adults and 2 children"). */
const PARTY_EXTENSION =
  /^\s*(?:[،,؛;]\s*)?(?:و|مع(?![ء-ي])|(?:and|with|plus)\b|[+&])/i;
const PARTY_WORD_SIZE: Record<string, number> = {
  one: 1,
  two: 2,
  both: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};
const PER_PERSON_LABEL =
  /(?:(?:السعر|سعر|التكلفة|تكلفة)\s*(?:للشخص|للفرد|لكل\s+(?:شخص|فرد))|(?:price|cost)\s+per\s+(?:person|pax|travell?er))\s*[:：\-–—]?\s*$/i;
const PER_NIGHT_LABEL =
  /(?:(?:السعر|سعر|التكلفة|تكلفة)\s*(?:لليلة|لكل\s+ليلة|في\s+الليلة)|(?:nightly|per[-\s]?night)\s*(?:price|cost)?)\s*[:：\-–—]?\s*$/i;
/**
 * A bare price label — "السعر 6,000 ريال" — with no "النهائي/الإجمالي".
 * Anchored to the end of the clause so "سعر الفندق 3000 ريال" does NOT match:
 * in Arabic the clause ends with the component word, not the price word.
 */
const PRICE_WORD_LABEL =
  /(?:السعر|سعر|التكلفة|تكلفة|المبلغ|price|cost)\s*[:：\-–—]?\s*$/i;
/** The parts an offer itemizes; their own price never rivals the total. */
const COMPONENT_ALT =
  "hotels?|flights?|airfare|tickets?|rooms?|nights?|visas?|insurance|transfers?|transport(?:ation)?|baggage|luggage|fees?|tax(?:es)?|meals?|tours?|excursions?|seats?";
/**
 * English puts the component BEFORE the price word ("Hotel price SAR 3,000"),
 * so the clause-end anchor alone would read it as the offer's price. This
 * rejects that order; Arabic needs no equivalent because its word order puts
 * the component last, where the anchor already excludes it.
 */
const COMPONENT_PRICE_LABEL = new RegExp(
  `\\b(?:${COMPONENT_ALT})(?:['’]s)?[\\s\\-–]+(?:price|cost)(?:\\s+(?:${PARTY_ALT}))?\\s*[:：\\-–—]?\\s*$`,
  "i"
);
/** A component subtotal (for example, "Hotel total") is not the trip total. */
const COMPONENT_TOTAL_ALT =
  "hotels?|flights?|airfare|tickets?|rooms?|visas?|insurance|transfers?|transport(?:ation)?|baggage|luggage|fees?|tax(?:es)?|meals?|tours?|excursions?|seats?";
const COMPONENT_TOTAL_LABEL = new RegExp(
  `\\b(?:${COMPONENT_TOTAL_ALT})(?:['’]s)?[\\s\\-–]+total(?:\\s+(?:price|cost))?(?:\\s+(?:${PARTY_ALT}))?\\s*[:：\\-–—]?\\s*$`,
  "i"
);
/**
 * An Arabic subtotal of one part of the trip — «إجمالي الإقامة»، «إجمالي
 * المواصلات والشرائح». Arabic names the part after «إجمالي», so the clause
 * starts with the subtotal word; anything but a trip word makes it a part.
 */
const ARABIC_COMPONENT_TOTAL_LABEL = new RegExp(
  `(?:^|[^\\p{L}])(?:و?ال)?(?:إجمالي|مجموع)\\s+(?!(?:(?:مبلغ|سعر|تكلفة)\\s+)?${TRIP_WORD}(?![\\p{L}]))(?!السعر)(?!(?:${PARTY_ALT}))(?:ال)?\\p{L}+[^:：\\n]*?[:：\\-–—]?\\s*$`,
  "u"
);
/**
 * A per-unit suffix right after the amount ("4200 ريال للشخص"). Such a figure
 * is a unit rate, not a competing total, so two of them differing is not a
 * contradiction. The word must end there: «للشخصين» is a party, not a person.
 */
const PER_PERSON_QUALIFIER = new RegExp(
  `^\\s*[/\\\\]?\\s*(?:(?:لكل\\s+(?:شخص|فرد|مسافر)|للشخص|للفرد)${ARABIC_WORD_END}|per\\s+(?:person|pax|travell?er))`,
  "i"
);
const PER_NIGHT_QUALIFIER =
  /^\s*(?:[/\\]\s*(?:ال)?ليلة|[/\\]\s*night\b|[/\\]?\s*(?:لكل\s+ليلة|لليلة|في\s+الليلة|per\s+night))/i;
const OTHER_PER_UNIT_QUALIFIER =
  /^\s*[/\\]?\s*(?:للبالغ|للراشد|للطفل|للغرفة|per\s+(?:adult|child|room))/i;
const CLAUSE_BOUNDARY = /[،,؛;.!?\n]/;

type PriceObservation = NonNullable<OfferObservations["prices"]>[number];

interface PriceMatch extends PriceObservation {
  index: number;
  length: number;
  /** A party's per-room or per-child rate ("للشخصين للغرفة"): never a total. */
  partyUnitRate?: boolean;
  /** A subtotal of one part of the trip ("إجمالي الإقامة", "Hotel total"). */
  component?: boolean;
}

type RawPriceMatch = Omit<PriceMatch, "basis">;

function collectMatches(
  normalizedText: string,
  originalText: string,
  pattern: RegExp,
  amountGroup: number,
  currencyGroup: number
): RawPriceMatch[] {
  pattern.lastIndex = 0;
  const matches: RawPriceMatch[] = [];

  for (const match of normalizedText.matchAll(pattern)) {
    const amount = parseAmount(match[amountGroup] ?? "");
    const currency = tokenToCurrencyCode(match[currencyGroup] ?? "");
    if (amount === null || currency === null || match.index === undefined) continue;

    matches.push({
      amount,
      currency,
      evidence: originalText.slice(match.index, match.index + match[0].length),
      index: match.index,
      length: match[0].length,
    });
  }

  return matches;
}

/** The text between the previous clause boundary and the match. */
function clausePrefix(text: string, matchIndex: number): string {
  return text.slice(0, matchIndex).split(CLAUSE_BOUNDARY).at(-1) ?? "";
}

function hasPriceWordContext(text: string, matchIndex: number): boolean {
  const prefix = clausePrefix(text, matchIndex);
  return PRICE_WORD_LABEL.test(prefix) && !COMPONENT_PRICE_LABEL.test(prefix);
}

function partySize(phrase: string): number | null {
  const digits = /\d{1,2}/.exec(phrase);
  if (digits) return Number(digits[0]);
  if (/(?:شخصين|فردين|اثنين)/.test(phrase)) return 2;
  const word = /\bfor\s+([a-z]+)/i.exec(phrase)?.[1]?.toLowerCase();
  return word ? (PARTY_WORD_SIZE[word] ?? null) : null;
}

/**
 * The party a total is stated for, with its evidence from the original text.
 * An inexact party ("for 2 adults and 2 children") keeps its evidence but no
 * size: the phrase alone does not give the head count.
 */
function partyOf(
  originalText: string,
  phraseStart: number,
  phrase: string,
  exact: boolean
): PriceObservation["party"] {
  const trimmed = phrase.trim();
  const size = exact ? partySize(trimmed) : null;
  if (exact && (size === null || size < 1)) return undefined;
  const start = phraseStart + phrase.indexOf(trimmed);
  return { size, evidence: originalText.slice(start, start + trimmed.length) };
}

function classifyMatch(normalizedText: string, originalText: string, match: RawPriceMatch): PriceMatch {
  const prefix = clausePrefix(normalizedText, match.index);
  const suffixStart = match.index + match.length;
  const suffix = normalizedText.slice(suffixStart);
  const perPersonSuffix = PER_PERSON_QUALIFIER.exec(suffix);
  // A unit after the party still makes a unit rate ("للشخصين في الليلة").
  const partyRaw = perPersonSuffix ? null : PARTY_QUALIFIER.exec(suffix);
  const afterParty = partyRaw ? suffix.slice(partyRaw[0].length) : suffix;
  const perNightSuffix = PER_NIGHT_QUALIFIER.exec(afterParty);
  const labelParty = PARTY_AT_LABEL_END.exec(prefix);
  const partyUnitRate =
    (partyRaw !== null || labelParty !== null) &&
    !perNightSuffix &&
    OTHER_PER_UNIT_QUALIFIER.test(afterParty);
  const component =
    COMPONENT_TOTAL_LABEL.test(prefix) || ARABIC_COMPONENT_TOTAL_LABEL.test(prefix);
  const totalLabel =
    (TOTAL_PRICE_LABEL.test(prefix) && !component) ||
    (PARTY_PRICE_LABEL.test(prefix) && !COMPONENT_PRICE_LABEL.test(prefix));
  // A party suffix makes a labelled price that party's total only when the
  // clause ends there or more people follow; on an unlabelled (possibly
  // itemized) amount, or before other words, it proves nothing.
  const partyExtended = partyRaw !== null && PARTY_EXTENSION.test(afterParty);
  const partyExact =
    partyRaw !== null && !partyExtended && PARTY_CLAUSE_END.test(afterParty);
  const partySuffix =
    (partyExact || partyExtended) &&
    (totalLabel || hasPriceWordContext(normalizedText, match.index))
      ? partyRaw
      : null;
  const basis: OfferPriceBasis =
    perPersonSuffix || PER_PERSON_LABEL.test(prefix)
      ? "per_person"
      : perNightSuffix || PER_NIGHT_LABEL.test(prefix)
        ? "per_night"
        : partyUnitRate
          ? "unspecified"
          : totalLabel || partySuffix
            ? "total"
            : "unspecified";

  const suffixLength =
    perPersonSuffix?.[0].length ??
    (perNightSuffix ? (partyRaw?.[0].length ?? 0) + perNightSuffix[0].length : undefined) ??
    (basis === "total" ? partySuffix?.[0].length : undefined) ??
    0;
  const party =
    basis !== "total"
      ? undefined
      : partySuffix
        ? partyOf(originalText, suffixStart, partySuffix[0], partyExact)
        : labelParty
          ? partyOf(
              originalText,
              match.index - prefix.length + labelParty.index,
              labelParty[1],
              true
            )
          : undefined;
  return {
    ...match,
    basis,
    evidence: originalText.slice(match.index, suffixStart + suffixLength).trim(),
    ...(party ? { party } : {}),
    ...(partyUnitRate ? { partyUnitRate } : {}),
    ...(component && basis === "unspecified" ? { component } : {}),
  };
}

/**
 * Collect the amounts that claim to BE the price of the offer, so that two
 * different such amounts are reported as a contradiction rather than silently
 * resolved. Three tiers, narrowest first:
 *
 *  1. Explicitly final — "السعر الإجمالي 5,000 ريال", "total price".
 *  2. Bare price label — "السعر 6,000 ريال". Counts as a competing total ONLY
 *     when it is not a per-unit rate and shares the primary currency; a figure
 *     in another currency is a restatement of the same price, not a rival one.
 *  3. Neither — an itemized hotel/flight/fee amount. Never competes; the
 *     existing single-price fallback still confirms the first one found.
 *
 * Ordering puts tier 1 first, so the CONFIRMED price stays the first explicitly
 * final one whenever the offer states it.
 */
export function extractPriceObservations(text: string): PriceObservation[] {
  return extractPrices(text).observations;
}

/**
 * Chat-style emphasis («*14,400 ريال*») is not part of a label. It is blanked
 * with spaces so match indexes still point into the original text.
 */
function normalizeForPrices(text: string): string {
  return toWesternDigits(text).replace(/[*_~]/g, " ");
}

/**
 * The trip's itemized subtotals ("إجمالي الإقامة 14,400 ريال"), in order, each
 * once. They are kept apart from the offer's price so they never rival it. A
 * subtotal restated in a summary (same label, same amount) counts once; the
 * same label with a different amount makes the breakdown unclear, so none is
 * returned and nothing is summed.
 */
function extractComponents(normalizedText: string, matches: PriceMatch[]): PriceComponent[] {
  const byLabel = new Map<string, PriceMatch>();
  for (const match of matches) {
    if (!match.component) continue;
    const label = clausePrefix(normalizedText, match.index)
      .replace(/[^\p{L}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const previous = byLabel.get(label);
    if (!previous) byLabel.set(label, match);
    else if (previous.amount !== match.amount || previous.currency !== match.currency) return [];
  }
  return [...byLabel.values()].map(({ amount, currency, evidence }) => ({ amount, currency, evidence }));
}

type PriceComponent = NonNullable<OfferObservations["priceComponents"]>[number];

function extractPrices(text: string): { observations: PriceObservation[]; components: PriceComponent[] } {
  const normalizedText = normalizeForPrices(text);
  const allMatches = [
    ...collectMatches(normalizedText, text, AMOUNT_THEN_CURRENCY, 1, 2),
    ...collectMatches(normalizedText, text, CURRENCY_THEN_AMOUNT, 2, 1),
  ]
    .sort((left, right) => left.index - right.index)
    .map((match) => classifyMatch(normalizedText, text, match));

  const contextual = allMatches.filter((match) => {
    if (match.partyUnitRate || match.component) return false;
    if (match.basis !== "unspecified") return true;
    if (!hasPriceWordContext(normalizedText, match.index)) return false;
    return !OTHER_PER_UNIT_QUALIFIER.test(
      normalizedText.slice(match.index + match.length)
    );
  });
  const totalMatches = contextual.filter((match) => match.basis === "total");
  const contextualMatches =
    totalMatches.length > 0
      ? contextual.filter(
          (match) =>
            match.basis !== "unspecified" ||
            totalMatches.some((total) => total.currency === match.currency)
        )
      : contextual;
  const basisPriority: Record<OfferPriceBasis, number> = {
    total: 0,
    per_person: 1,
    per_night: 2,
    unspecified: 3,
  };
  const matches = (contextualMatches.length > 0 ? contextualMatches : allMatches.slice(0, 1)).sort(
    (left, right) => basisPriority[left.basis] - basisPriority[right.basis] || left.index - right.index
  );

  const seen = new Set<string>();
  const observations: PriceObservation[] = [];
  for (const { amount, currency, basis, evidence, party } of matches) {
    const key = `${amount}\u0000${currency}\u0000${basis}`;
    if (seen.has(key)) continue;
    if (
      basis === "unspecified" &&
      observations.some((price) => price.amount === amount && price.currency === currency)
    ) {
      continue;
    }
    seen.add(key);
    observations.push({ amount, currency, basis, evidence, ...(party ? { party } : {}) });
  }
  return { observations, components: extractComponents(normalizedText, allMatches) };
}

export const priceRule: ExtractionRule = {
  key: "price",
  apply(text: string): RuleResult {
    const { observations: prices, components } = extractPrices(text);
    const first =
      prices.find((price) => price.basis === "total") ??
      prices.find((price) => price.basis === "unspecified") ??
      prices.find((price) => price.basis === "per_person") ??
      prices.find((price) => price.basis === "per_night");
    if (!first) return { facts: {}, warnings: [] };

    const value: OfferPrice = { amount: first.amount, currency: first.currency };
    const fact = exact(value, first.evidence);
    const facts: Partial<ExtractedOfferFacts> = { price: fact };
    const basisFact = (basis: OfferPriceBasis) => {
      const observation = prices.find((price) => price.basis === basis);
      return observation
        ? exact(
            { amount: observation.amount, currency: observation.currency },
            observation.evidence
          )
        : undefined;
    };
    const totalPrice = basisFact("total");
    const perPersonPrice = basisFact("per_person");
    const perNightPrice = basisFact("per_night");
    const statedPrice = basisFact("unspecified");
    if (totalPrice) facts.totalPrice = totalPrice;
    if (perPersonPrice) facts.perPersonPrice = perPersonPrice;
    if (perNightPrice) facts.perNightPrice = perNightPrice;
    if (statedPrice) facts.statedPrice = statedPrice;
    return {
      facts,
      warnings: [],
      observations: {
        prices,
        currencies: prices.map((price) => ({
          code: price.currency,
          evidence: price.evidence,
        })),
        ...(components.length > 0 ? { priceComponents: components } : {}),
      },
    };
  },
};
