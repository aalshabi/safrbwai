/**
 * PriceRule — extracts a monetary amount that is directly adjacent to a
 * currency token (either order), yielding a complete `price` fact. A bare
 * number with no adjacent currency is intentionally NOT extracted (ambiguous).
 */

import type { OfferPrice } from "@/lib/offer-pipeline/types";
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
const FINAL_PRICE_LABEL =
  /(?:السعر\s+(?:النهائي|الإجمالي)|(?:final|total)\s+price)\s*[:：\-–—]?\s*$/i;
/**
 * A bare price label — "السعر 6,000 ريال" — with no "النهائي/الإجمالي".
 * Anchored to the end of the clause so "سعر الفندق 3000 ريال" does NOT match:
 * there the clause ends with the component word, not the price word.
 */
const PRICE_WORD_LABEL =
  /(?:السعر|سعر|التكلفة|تكلفة|المبلغ|price|cost)\s*[:：\-–—]?\s*$/i;
/**
 * A per-unit suffix right after the amount ("4200 ريال للشخص"). Such a figure
 * is a unit rate, not a competing total, so two of them differing is not a
 * contradiction.
 */
const PER_UNIT_QUALIFIER =
  /^\s*[/\\]?\s*(?:لكل\s+\S+|للشخص|للفرد|للبالغ|للراشد|للطفل|لليلة|في\s+الليلة|للغرفة|per\s+(?:person|pax|adult|child|night|room))/i;
const CLAUSE_BOUNDARY = /[،,؛;.!?\n]/;

type PriceObservation = NonNullable<OfferObservations["prices"]>[number];

interface PriceMatch extends PriceObservation {
  index: number;
  length: number;
}

function collectMatches(
  normalizedText: string,
  originalText: string,
  pattern: RegExp,
  amountGroup: number,
  currencyGroup: number
): PriceMatch[] {
  pattern.lastIndex = 0;
  const matches: PriceMatch[] = [];

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

function hasFinalPriceContext(text: string, matchIndex: number): boolean {
  return FINAL_PRICE_LABEL.test(clausePrefix(text, matchIndex));
}

function hasPriceWordContext(text: string, matchIndex: number): boolean {
  return PRICE_WORD_LABEL.test(clausePrefix(text, matchIndex));
}

function isPerUnitAmount(text: string, matchEnd: number): boolean {
  return PER_UNIT_QUALIFIER.test(text.slice(matchEnd));
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
  ].sort((left, right) => left.index - right.index);

  const finalPriceMatches = allMatches.filter((match) =>
    hasFinalPriceContext(normalizedText, match.index)
  );
  const finalPriceSet = new Set(finalPriceMatches);
  const labelledMatches = allMatches.filter(
    (match) =>
      !finalPriceSet.has(match) &&
      hasPriceWordContext(normalizedText, match.index) &&
      !isPerUnitAmount(normalizedText, match.index + match.length)
  );

  // The currency guard applies to tier 2 only: tier 1 keeps reporting a
  // cross-currency conflict exactly as it did before.
  const primaryCurrency = (finalPriceMatches[0] ?? labelledMatches[0])?.currency;
  const competing = [
    ...finalPriceMatches,
    ...labelledMatches.filter((match) => match.currency === primaryCurrency),
  ];
  const matches = competing.length > 0 ? competing : allMatches.slice(0, 1);

  const seen = new Set<string>();
  const observations: PriceObservation[] = [];
  for (const { amount, currency, evidence } of matches) {
    const key = `${amount}\u0000${currency}`;
    if (seen.has(key)) continue;
    seen.add(key);
    observations.push({ amount, currency, evidence });
  }
  return observations;
}

export const priceRule: ExtractionRule = {
  key: "price",
  apply(text: string): RuleResult {
    const prices = extractPriceObservations(text);
    const first = prices[0];
    if (!first) return { facts: {}, warnings: [] };

    const value: OfferPrice = { amount: first.amount, currency: first.currency };
    return {
      facts: { price: exact(value, first.evidence) },
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
