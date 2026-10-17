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
/**
 * Words that, right before "total", still name the whole trip: a trip word
 * ("Trip total", "Grand total"), its length or party ("7 nights total",
 * "2 adults total"), a price word, or a function word ("the total", "in total").
 */
const WHOLE_TRIP_TOTAL_WORD =
  `trip|package|grand|overall|final|offer|holiday|vacation|booking|order|price|cost|amount|sum` +
  `|nights?|days?|weeks?|${PARTY_NOUN_EN}|the|your|our|this|its|a|an|in|is`;
/** The parts an English offer commonly itemizes as "<part> total". */
const KNOWN_COMPONENT_ALT =
  "accommodations?|stays?|resorts?|lodging|activit(?:y|ies)|hotels?|flights?|airfare|tickets?|rooms?|visas?|insurance|transfers?|transport(?:ation)?|baggage|luggage|fees?|tax(?:es)?|meals?|tours?|excursions?|seats?|sims?|cards?|rental|car|cars|pickup|spa|sub";
/** Words that make a total the whole trip's, however it starts. */
const TRIP_TOTAL_WORD = "trip|package|grand|overall|final|offer|holiday|vacation|booking|order";
/**
 * "Hotel total", "Transfers total", "Tour guide total": a known part, maybe
 * followed by a few more words, is always a subtotal — unless one of those
 * words makes it the whole trip's ("Hotel and flight package total").
 */
const KNOWN_COMPONENT_TOTAL_LABEL = new RegExp(
  `\\b(?:${KNOWN_COMPONENT_ALT})(?:['’]s|['’])?(?:\\s+(?!(?:${TRIP_TOTAL_WORD})\\b)[a-z]+(?:['’]s|['’])?){0,3}(?:\\s+|\\s*[\\-–]\\s*)total(?:\\s+(?:price|cost))?(?:\\s+(?:${PARTY_ALT}))?${LABEL_END}`,
  "i"
);
/**
 * Any other qualified total ("SIM cards total", "Estimated total", "Net
 * total"). Whether the qualifier names a part or describes the whole trip
 * cannot be told from the word alone, so the offer decides: beside an
 * unqualified trip total ("Trip total", "Total") it is a part; with no such
 * total it is the trip's total.
 */
const QUALIFIED_TOTAL_LABEL = new RegExp(
  `\\b(?!(?:${WHOLE_TRIP_TOTAL_WORD})\\b)[a-z]+(?:['’]s|['’])?(?:\\s+|\\s*[\\-–]\\s*)total(?:\\s+(?:price|cost))?(?:\\s+(?:${PARTY_ALT}))?${LABEL_END}`,
  "i"
);
/**
 * An Arabic subtotal of one part of the trip — «إجمالي الإقامة»، «إجمالي
 * المواصلات والشرائح». Arabic names the part after «إجمالي», so the clause
 * starts with the subtotal word; anything but a trip word makes it a part.
 */
const ARABIC_COMPONENT_TOTAL_LABEL = new RegExp(
  `(?:^|[^\\p{L}])(?:و?ال)?(?:إجمالي|مجموع)\\s+(?!(?:(?:مبلغ|سعر|تكلفة)\\s+)?${TRIP_WORD}(?![\\p{L}]))(?!السعر)(?!(?:ال)?(?:كلي|نهائي|عام|إجمالي)(?![\\p{L}]))(?!(?:${PARTY_ALT}))(?:ال)?\\p{L}+[^:：\\n]*?[:：\\-–—]?\\s*$`,
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
  /**
   * A subtotal of one part of the trip ("إجمالي الإقامة", "Hotel total"),
   * whatever its basis: a per-person subtotal is still not the package price.
   */
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

function classifyMatch(
  normalizedText: string,
  originalText: string,
  match: RawPriceMatch,
  qualifiedIsTotal = false
): PriceMatch {
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
  const qualified =
    !KNOWN_COMPONENT_TOTAL_LABEL.test(prefix) && QUALIFIED_TOTAL_LABEL.test(prefix);
  const component =
    KNOWN_COMPONENT_TOTAL_LABEL.test(prefix) ||
    ARABIC_COMPONENT_TOTAL_LABEL.test(prefix) ||
    // A per-adult/child/room amount is a rate, never the trip's total.
    (qualified && (!qualifiedIsTotal || OTHER_PER_UNIT_QUALIFIER.test(suffix)));
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
    ...(component ? { component } : {}),
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
 * The trip's itemized subtotals ("إجمالي الإقامة 14,400 ريال"), kept apart from
 * the offer's price so they never rival it. Only the summary block that ends
 * at the trip total counts — the subtotal lines right above it, with nothing
 * but blank lines between them — since subtotals elsewhere in the offer do not
 * show that the breakdown is complete. A label repeated in that block may be a
 * restatement or a second charge, so the breakdown is then unclear and none
 * is returned.
 */
function extractComponents(normalizedText: string, matches: PriceMatch[]): PriceComponent[] {
  // A total may be stated more than once; the summary block (two or more
  // usable subtotals) sits above one of them, so each is tried in turn.
  for (const total of matches.filter((match) => match.basis === "total")) {
    const block = summaryBlock(normalizedText, matches, total);
    // A per-person or per-night subtotal cannot be added to a trip total.
    if (block.some((part) => part.basis !== "unspecified")) continue;
    const components = uniqueComponents(normalizedText, block);
    if (components.length >= 2) return components;
  }
  return [];
}

function summaryBlock(normalizedText: string, matches: PriceMatch[], total: PriceMatch): PriceMatch[] {
  const lineStart = (index: number) => normalizedText.lastIndexOf("\n", index - 1) + 1;
  const block: PriceMatch[] = [];
  let cursor = lineStart(total.index);
  while (cursor > 0) {
    const start = lineStart(cursor - 1);
    const line = normalizedText.slice(start, cursor - 1);
    cursor = start;
    if (line.trim() === "") continue;
    const parts = matches.filter((match) => match.component && match.index >= start && match.index < start + line.length);
    if (parts.length === 0) break;
    block.unshift(...parts);
  }
  return block;
}

function uniqueComponents(normalizedText: string, block: PriceMatch[]): PriceComponent[] {
  const byLabel = new Map<string, PriceMatch>();
  for (const match of block) {
    const label = clausePrefix(normalizedText, match.index)
      .replace(/[^\p{L}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    // Two lines with one label may be a restatement or two separate charges
    // ("Hotel total" for two hotels); the breakdown is then unclear.
    if (byLabel.has(label)) return [];
    byLabel.set(label, match);
  }
  return [...byLabel.values()].map(({ amount, currency, evidence }) => ({ amount, currency, evidence }));
}

type PriceComponent = NonNullable<OfferObservations["priceComponents"]>[number];

function extractPrices(text: string): { observations: PriceObservation[]; components: PriceComponent[] } {
  const normalizedText = normalizeForPrices(text);
  const rawMatches = [
    ...collectMatches(normalizedText, text, AMOUNT_THEN_CURRENCY, 1, 2),
    ...collectMatches(normalizedText, text, CURRENCY_THEN_AMOUNT, 2, 1),
  ]
    .sort((left, right) => left.index - right.index);
  // A qualified total ("Estimated total") is a part only beside an unqualified
  // trip total; with none, it is read again as the trip's total.
  let allMatches = rawMatches.map((match) => classifyMatch(normalizedText, text, match));
  if (!allMatches.some((match) => match.basis === "total")) {
    allMatches = rawMatches.map((match) => classifyMatch(normalizedText, text, match, true));
  }

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
