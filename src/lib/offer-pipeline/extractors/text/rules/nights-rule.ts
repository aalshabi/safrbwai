/**
 * NightsRule — extracts an explicit number of nights. Only "nights"/"ليالٍ"
 * units are accepted; a count of days is NOT treated as nights (no inference).
 */

import type { OfferObservations } from "@/lib/offer-pipeline/analysis/types";
import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

// e.g. "5 ليالٍ", "٥ ليال", "لمدة 5 ليالي", "5 nights", "5-night"
const NIGHTS = /(\d{1,3})[\s-]*(?:ليال(?:ٍ|ي)?|ليلة|nights?)/gi;

type NightObservation = NonNullable<OfferObservations["nights"]>[number];

/**
 * What marks a count as one stay of a split trip: its line names a stay
 * («الإقامة الأولى | 4 ليالٍ», "Hotel 2: 3 nights") or the count is followed by
 * where it is spent («4 ليالٍ في دبي», "3 nights in Rome").
 */
const STAY_LINE = /(?:إقامة|الإقامة|فندق|الفندق|منتجع|المنتجع|\bstay\b|\bhotel\b|\bresort\b)/iu;
const STAY_AFTER = /^\s*(?:في|ب|\bin\b|\bat\b)/iu;

function lineAround(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end < 0 ? undefined : end);
}

export function extractNightObservations(text: string): NightObservation[] {
  const normalizedText = toWesternDigits(text);
  const occurrences: (NightObservation & { isStay: boolean; onStayLine: boolean; index: number })[] = [];

  for (const match of normalizedText.matchAll(NIGHTS)) {
    if (match.index === undefined) continue;

    // A signed count ("-5 ليالٍ") is not a valid night count: the pattern
    // captures digits only, so the sign is checked explicitly.
    const preceding = normalizedText[match.index - 1];
    if (preceding === "-" || preceding === "−") continue;

    const value = Number(match[1]);
    if (!Number.isInteger(value) || value <= 0) continue;

    const end = match.index + match[0].length;
    const onStayLine = STAY_LINE.test(lineAround(normalizedText, match.index));
    occurrences.push({
      value,
      evidence: text.slice(match.index, end),
      index: match.index,
      onStayLine,
      isStay: onStayLine || STAY_AFTER.test(normalizedText.slice(end)),
    });
  }

  // A stay split across hotels ("7 ليالٍ" … "الإقامة الأولى | 4 ليالٍ" …
  // "الإقامة الثانية | 3 ليالٍ", or the parts first and "Total: 7 nights"
  // last) states its parts beside the total. They are its parts, not rival
  // values, only when every count other than the total (however often it is
  // restated) is marked as a stay and together they add up to it; the sum
  // alone proves nothing.
  const toObservation = ({ value, evidence }: NightObservation) => ({ value, evidence });
  const total = occurrences.find((candidate) => {
    // The total may be restated ("7 nights in …" … "Total: 7 nights"): every
    // count equal to it is the same total, never one of its parts.
    const parts = occurrences.filter((n) => n.value !== candidate.value);
    // The total must be stated off any stay line at least once, so stays that
    // happen to add up ("Stay 1: 4 / Stay 2: 3 / Stay 3: 1") never become one.
    const statedAsTotal = occurrences.some((n) => n.value === candidate.value && !n.onStayLine);
    return (
      statedAsTotal &&
      parts.length >= 2 &&
      parts.every((n) => n.isStay) &&
      parts.reduce((sum, n) => sum + n.value, 0) === candidate.value
    );
  });
  if (total) return [toObservation(total)];

  const seen = new Set<number>();
  return occurrences
    .filter((n) => {
      if (seen.has(n.value)) return false;
      seen.add(n.value);
      return true;
    })
    .map(toObservation);
}

export const nightsRule: ExtractionRule = {
  key: "nights",
  apply(text: string): RuleResult {
    const observations = extractNightObservations(text);
    const first = observations[0];
    if (!first) return { facts: {}, warnings: [] };

    return {
      facts: { nights: exact(first.value, first.evidence) },
      warnings: [],
      observations: { nights: observations },
    };
  },
};
