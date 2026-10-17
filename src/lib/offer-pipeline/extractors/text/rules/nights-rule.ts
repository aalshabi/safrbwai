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
/** A line that states the trip's overall length ("المدة: 7 ليالٍ", "Total: 7 nights"). */
const TOTAL_LINE = /(?:إجمالي|الإجمالي|مجموع|المجموع|المدة|مدة|\btotal\b|\bduration\b|\boverall\b)/iu;
const STAY_AFTER = /^\s*(?:في|ب|\bin\b|\bat\b)/iu;

/**
 * The clause holding `index`: a line, or one part of a line split by «؛»/";"
 * ("Total: 7 nights; Stay 1: 4 nights"), so each count is read in its own
 * context rather than by every label on its line.
 */
function clauseAround(text: string, index: number): string {
  const boundary = /[\n;؛]/;
  let start = index;
  while (start > 0 && !boundary.test(text[start - 1])) start--;
  let end = index;
  while (end < text.length && !boundary.test(text[end])) end++;
  return text.slice(start, end);
}

export function extractNightObservations(text: string): NightObservation[] {
  const normalizedText = toWesternDigits(text);
  const occurrences: (NightObservation & {
    isStay: boolean;
    onStayLine: boolean;
    onTotalLine: boolean;
  })[] = [];

  for (const match of normalizedText.matchAll(NIGHTS)) {
    if (match.index === undefined) continue;

    // A signed count ("-5 ليالٍ") is not a valid night count: the pattern
    // captures digits only, so the sign is checked explicitly.
    const preceding = normalizedText[match.index - 1];
    if (preceding === "-" || preceding === "−") continue;

    const value = Number(match[1]);
    if (!Number.isInteger(value) || value <= 0) continue;

    const end = match.index + match[0].length;
    const line = clauseAround(normalizedText, match.index);
    const onStayLine = STAY_LINE.test(line);
    occurrences.push({
      value,
      evidence: text.slice(match.index, end),
      onStayLine,
      onTotalLine: TOTAL_LINE.test(line),
      isStay: onStayLine || STAY_AFTER.test(normalizedText.slice(end)),
    });
  }

  // A stay split across hotels ("7 ليالٍ" … "الإقامة الأولى | 4 ليالٍ" …
  // "الإقامة الثانية | 3 ليالٍ", or the parts first and "Total: 7 nights"
  // last) states its parts beside the total. They are its parts, not rival
  // values, only when the total is positively a total — the offer's first
  // count and not itself a stay, or a count on a total/duration line — and
  // every other count is a stay, together adding up to it exactly. The sum
  // alone proves nothing, so stays that happen to add up stay separate.
  const toObservation = ({ value, evidence }: NightObservation) => ({ value, evidence });
  const first = occurrences[0];
  const total = occurrences.find((candidate) => {
    const isTotal = occurrences.some(
      (n) =>
        n.value === candidate.value &&
        ((n === first && !n.isStay) || (n.onTotalLine && !n.onStayLine))
    );
    // The total may be restated ("7 ليالٍ" … "Total: 7 nights"); an equal
    // count that is not a stay is that restatement, while one marked as a
    // stay ("Stay 1: 7 nights", "7 nights in Dubai") is a part.
    const parts = occurrences.filter((n) => n.value !== candidate.value || n.isStay);
    return (
      isTotal &&
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
