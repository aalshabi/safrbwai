/**
 * Deterministic, provable contradiction detection. A contradiction is reported
 * ONLY when observations genuinely disagree (distinct final prices, conflicting
 * currency, differing night counts, conflicting board, conflicting baggage, or
 * a boolean inclusion asserted both true and false).
 *
 * severity is "critical" ONLY when the conflict fundamentally blocks
 * understanding the offer — currently just multiple different final prices.
 */

import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import type { Contradiction, OfferObservations } from "./types";

/** Derive per-field observation lists from a single facts object (≤ 1 each). */
function deriveObservations(facts: ExtractedOfferFacts): Required<OfferObservations> {
  const explicitPrices = [
    facts.totalPrice && { ...facts.totalPrice, basis: "total" as const },
    facts.perPersonPrice && { ...facts.perPersonPrice, basis: "per_person" as const },
    facts.perNightPrice && { ...facts.perNightPrice, basis: "per_night" as const },
    facts.statedPrice && { ...facts.statedPrice, basis: "unspecified" as const },
  ].filter((fact): fact is NonNullable<typeof fact> => Boolean(fact));
  const prices =
    explicitPrices.length > 0
      ? explicitPrices.map((fact) => ({
          amount: fact.value.amount,
          currency: fact.value.currency,
          basis: fact.basis,
          evidence: fact.evidence,
        }))
      : facts.price
        ? [
            {
              amount: facts.price.value.amount,
              currency: facts.price.value.currency,
              basis: "unspecified" as const,
              evidence: facts.price.evidence,
            },
          ]
        : [];
  const currencies: { code: string; evidence: string }[] = [];
  if (facts.currency) currencies.push({ code: facts.currency.value, evidence: facts.currency.evidence });
  for (const price of prices) {
    currencies.push({ code: price.currency, evidence: price.evidence });
  }

  return {
    prices,
    currencies,
    nights: facts.nights ? [{ value: facts.nights.value, evidence: facts.nights.evidence }] : [],
    boards: facts.board ? [{ value: facts.board.value, evidence: facts.board.evidence }] : [],
    baggage: facts.baggage ? [{ value: facts.baggage.value, evidence: facts.baggage.evidence }] : [],
    insurance: facts.insurance ? [{ value: facts.insurance.value, evidence: facts.insurance.evidence }] : [],
    visa: facts.visa ? [{ value: facts.visa.value, evidence: facts.visa.evidence }] : [],
    transfers: facts.transfer ? [{ value: facts.transfer.value.included, evidence: facts.transfer.evidence }] : [],
  };
}

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function detectContradictions(
  facts: ExtractedOfferFacts,
  observations?: OfferObservations
): Contradiction[] {
  const derived = deriveObservations(facts);
  const obs = { ...derived, ...(observations ?? {}) };
  const out: Contradiction[] = [];

  // Only prices stated as totals (or legacy unqualified offer prices when no
  // total exists) can contradict each other. Unit rates are separate facts.
  const totalPrices = obs.prices.filter((price) => price.basis === "total");
  const unspecifiedPrices = obs.prices.filter((price) => price.basis === "unspecified");
  const rivalTotals =
    totalPrices.length > 0 ? [...totalPrices, ...unspecifiedPrices] : unspecifiedPrices;
  if (distinct(rivalTotals.map((price) => price.amount)).length > 1) {
    out.push({
      code: "multiple_prices",
      message: { ar: "توجد أكثر من قيمة سعر نهائي مختلفة.", en: "More than one different final price is stated." },
      evidence: rivalTotals.map((price) => price.evidence),
      severity: "critical",
    });
  }

  // A mismatch is provable only when the offer states one total, one
  // per-person price in the same currency, and an exact traveller count.
  // Per-night prices never participate and no missing total is synthesized.
  const uniqueTotals = uniquePrices(totalPrices);
  const uniquePerPerson = uniquePrices(
    obs.prices.filter((price) => price.basis === "per_person")
  );
  const travellerCount =
    (facts.travelers?.value.adults ?? 0) + (facts.travelers?.value.children ?? 0);
  if (
    uniqueTotals.length === 1 &&
    uniquePerPerson.length === 1 &&
    travellerCount > 0 &&
    uniqueTotals[0].currency === uniquePerPerson[0].currency &&
    Math.abs(uniqueTotals[0].amount - uniquePerPerson[0].amount * travellerCount) > 0.01
  ) {
    out.push({
      code: "price_total_mismatch",
      message: {
        ar: "السعر الإجمالي لا يطابق سعر الشخص مضروبًا في عدد المسافرين.",
        en: "The stated total does not match the per-person price multiplied by the traveller count.",
      },
      evidence: [
        uniqueTotals[0].evidence,
        uniquePerPerson[0].evidence,
        facts.travelers?.evidence ?? String(travellerCount),
      ],
      severity: "critical",
    });
  }

  // conflicting currency for the price
  if (distinct(obs.currencies.map((c) => c.code)).length > 1) {
    out.push({
      code: "conflicting_currency",
      message: { ar: "العملة المذكورة متعارضة.", en: "The stated currency is conflicting." },
      evidence: obs.currencies.map((c) => c.evidence),
      severity: "warning",
    });
  }

  // differing night counts
  if (distinct(obs.nights.map((n) => n.value)).length > 1) {
    out.push({
      code: "conflicting_nights",
      message: { ar: "عدد الليالي مذكور بقيمتين مختلفتين.", en: "The number of nights is stated with two different values." },
      evidence: obs.nights.map((n) => n.evidence),
      severity: "warning",
    });
  }

  // conflicting board types
  if (distinct(obs.boards.map((b) => b.value)).length > 1) {
    out.push({
      code: "conflicting_board",
      message: { ar: "نوع الوجبة مذكور بشكلين متعارضين.", en: "The board type is stated in two conflicting ways." },
      evidence: obs.boards.map((b) => b.evidence),
      severity: "warning",
    });
  }

  // conflicting baggage
  if (distinct(obs.baggage.map((b) => b.value)).length > 1) {
    out.push({
      code: "conflicting_baggage",
      message: { ar: "الأمتعة مذكورة بشكلين متعارضين.", en: "Baggage is stated in two conflicting ways." },
      evidence: obs.baggage.map((b) => b.evidence),
      severity: "warning",
    });
  }

  // boolean inclusions asserted both true and false
  pushBooleanConflict(out, obs.insurance, "conflicting_insurance", {
    ar: "التأمين مذكور مشمولًا وغير مشمول.",
    en: "Insurance is stated as both included and excluded.",
  });
  pushBooleanConflict(out, obs.visa, "conflicting_visa", {
    ar: "التأشيرة مذكورة مشمولة وغير مشمولة.",
    en: "Visa is stated as both included and excluded.",
  });
  pushBooleanConflict(out, obs.transfers, "conflicting_transfers", {
    ar: "التحويلات مذكورة مشمولة وغير مشمولة.",
    en: "Transfers are stated as both included and excluded.",
  });

  return out;
}

function uniquePrices(prices: OfferObservations["prices"] = []) {
  const seen = new Set<string>();
  return prices.filter((price) => {
    const key = `${price.amount}\u0000${price.currency}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pushBooleanConflict(
  out: Contradiction[],
  items: { value: boolean; evidence: string }[],
  code: Contradiction["code"],
  message: { ar: string; en: string }
) {
  const hasTrue = items.some((i) => i.value === true);
  const hasFalse = items.some((i) => i.value === false);
  if (hasTrue && hasFalse) {
    out.push({ code, message, evidence: items.map((i) => i.evidence), severity: "warning" });
  }
}
