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
const TOTAL_PRICE_LABEL =
  /(?:السعر\s+(?:النهائي|الإجمالي)|(?:و?ال)?(?:إجمالي|مجموع)(?:\s+السعر)?|(?:final|total)\s+(?:price|cost)|grand\s+total)\s*(?:هو|is)?\s*[:：\-–—]?\s*$/i;
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
  `\\b(?:${COMPONENT_ALT})(?:['’]s)?[\\s\\-–]+(?:price|cost)\\s*[:：\\-–—]?\\s*$`,
  "i"
);
/**
 * A per-unit suffix right after the amount ("4200 ريال للشخص"). Such a figure
 * is a unit rate, not a competing total, so two of them differing is not a
 * contradiction.
 */
const PER_PERSON_QUALIFIER =
  /^\s*[/\\]?\s*(?:لكل\s+(?:شخص|فرد|مسافر)|للشخص|للفرد|per\s+(?:person|pax|travell?er))/i;
const PER_NIGHT_QUALIFIER =
  /^\s*[/\\]?\s*(?:لكل\s+ليلة|لليلة|في\s+الليلة|per\s+night)/i;
const OTHER_PER_UNIT_QUALIFIER =
  /^\s*[/\\]?\s*(?:للبالغ|للراشد|للطفل|للغرفة|per\s+(?:adult|child|room))/i;
const CLAUSE_BOUNDARY = /[،,؛;.!?\n]/;

type PriceObservation = NonNullable<OfferObservations["prices"]>[number];

interface PriceMatch extends PriceObservation {
  index: number;
  length: number;
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

function classifyMatch(normalizedText: string, originalText: string, match: RawPriceMatch): PriceMatch {
  const prefix = clausePrefix(normalizedText, match.index);
  const suffix = normalizedText.slice(match.index + match.length);
  const perPersonSuffix = PER_PERSON_QUALIFIER.exec(suffix);
  const perNightSuffix = PER_NIGHT_QUALIFIER.exec(suffix);
  const basis: OfferPriceBasis =
    perPersonSuffix || PER_PERSON_LABEL.test(prefix)
      ? "per_person"
      : perNightSuffix || PER_NIGHT_LABEL.test(prefix)
        ? "per_night"
        : TOTAL_PRICE_LABEL.test(prefix)
          ? "total"
          : "unspecified";

  const suffixLength = perPersonSuffix?.[0].length ?? perNightSuffix?.[0].length ?? 0;
  return {
    ...match,
    basis,
    evidence: originalText.slice(match.index, match.index + match.length + suffixLength).trim(),
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
  const normalizedText = toWesternDigits(text);
  const allMatches = [
    ...collectMatches(normalizedText, text, AMOUNT_THEN_CURRENCY, 1, 2),
    ...collectMatches(normalizedText, text, CURRENCY_THEN_AMOUNT, 2, 1),
  ]
    .sort((left, right) => left.index - right.index)
    .map((match) => classifyMatch(normalizedText, text, match));

  const contextual = allMatches.filter((match) => {
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
  for (const { amount, currency, basis, evidence } of matches) {
    const key = `${amount}\u0000${currency}\u0000${basis}`;
    if (seen.has(key)) continue;
    if (
      basis === "unspecified" &&
      observations.some((price) => price.amount === amount && price.currency === currency)
    ) {
      continue;
    }
    seen.add(key);
    observations.push({ amount, currency, basis, evidence });
  }
  return observations;
}

export const priceRule: ExtractionRule = {
  key: "price",
  apply(text: string): RuleResult {
    const prices = extractPriceObservations(text);
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
      },
    };
  },
};
