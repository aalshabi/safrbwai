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
 * What marks a count as one stay of a split trip: its label names a stay
 * («الإقامة الأولى | 4 ليالٍ», "Hotel 2: 3 nights") or the count is followed by
 * where it is spent («4 ليالٍ في دبي», "3 nights in Rome").
 */
const STAY_LINE = /(?:إقامة|الإقامة|فندق|الفندق|منتجع|المنتجع|\bstay\b|\bhotel\b|\bresort\b)/iu;
/** A label that states the trip's overall length ("المدة: 7 ليالٍ", "Total: 7 nights"). */
const TOTAL_LINE = /(?:إجمالي|الإجمالي|مجموع|المجموع|المدة|مدة|\btotal\b|\bduration\b|\boverall\b)/iu;
const STAY_AFTER = /^\s*(?:في|ب|\bin\b|\bat\b)/iu;

/**
 * The label in front of a count: the text since the previous count or the
 * start of its clause (a line, or part of one after «؛»/";"), whichever is
 * later. Labels precede what they name, so "Total: 7 nights | Hotel A: 4
 * nights" gives "Total: " to the 7 and " | Hotel A: " to the 4, while
 * «الإقامة الأولى | 4 ليالٍ» keeps its label across the pipe.
 */
function labelBefore(text: string, index: number, previousEnd: number): string {
  let start = index;
  while (start > previousEnd && !/[\n;؛]/.test(text[start - 1])) start--;
  return text.slice(start, index);
}

/** Words that say a count is a stay but not WHICH stay it is. */
const GENERIC_STAY_WORDS =
  /(?:^|\s)(?:الإقامة|إقامة|اقامة|الفندق|فندق|المنتجع|منتجع|مدة|لمدة|stay|hotel|resort|accommodation|the|for|of)(?=\s|$)/giu;
/** Where a stay is spent, right after its count ("4 nights in Dubai", «في دبي»). */
const PLACE_AFTER = /^\s*(?:في|ب|in|at)\s+([^\d,،؛;\n|.]+)/iu;

/**
 * Which stay a count names — "a" for "Hotel A: 4 nights" and "Hotel A stay: 4
 * nights", «الأولى» for «الإقامة الأولى | 4 ليالٍ», "dubai" for "4 nights in
 * Dubai" — so a stay mentioned twice counts once. Empty when the text does
 * not say which stay it is; such counts are never merged.
 */
function stayName(label: string, after: string): string {
  const named = label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(GENERIC_STAY_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  const place = (PLACE_AFTER.exec(after)?.[1] ?? "")
    .toLowerCase()
    .replace(/\s+(?:و|and)\s*$/u, "")
    .replace(/\s+و$/u, "")
    .trim();
  return [named, place].filter(Boolean).join(" @ ");
}

export function extractNightObservations(text: string): NightObservation[] {
  return readNights(text).observations;
}

/**
 * The offer's night counts, and the one that states the package's length.
 * Separate stays with no total that collapses them ("Hotel A: 4 nights",
 * "Hotel B: 4 nights") span their sum, not any one of them, so none of them
 * is the length: only a count that is not a stay can be, and with none the
 * length is left unknown — and the stays are dropped, since they are parts,
 * not rival lengths.
 */
function readNights(text: string): { observations: NightObservation[]; length?: NightObservation } {
  const normalizedText = toWesternDigits(text);
  const occurrences: (NightObservation & {
    isStay: boolean;
    onStayLine: boolean;
    onTotalLine: boolean;
    stay: string;
  })[] = [];

  let previousEnd = 0;
  for (const match of normalizedText.matchAll(NIGHTS)) {
    if (match.index === undefined) continue;

    // A signed count ("-5 ليالٍ") is not a valid night count: the pattern
    // captures digits only, so the sign is checked explicitly.
    const preceding = normalizedText[match.index - 1];
    if (preceding === "-" || preceding === "−") continue;

    const value = Number(match[1]);
    if (!Number.isInteger(value) || value <= 0) continue;

    const end = match.index + match[0].length;
    const label = labelBefore(normalizedText, match.index, previousEnd);
    previousEnd = end;
    const onStayLine = STAY_LINE.test(label);
    const after = normalizedText.slice(end);
    occurrences.push({
      value,
      evidence: text.slice(match.index, end),
      onStayLine,
      onTotalLine: TOTAL_LINE.test(label),
      isStay: onStayLine || STAY_AFTER.test(after),
      stay: stayName(label, after),
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
  if (total) return { observations: [toObservation(total)], length: toObservation(total) };

  const seen = new Set<number>();
  const observations = occurrences
    .filter((n) => {
      if (seen.has(n.value)) return false;
      seen.add(n.value);
      return true;
    })
    .map(toObservation);
  // One stay mentioned twice ("Hotel A: 4 nights" … "Hotel A stay: 4 nights")
  // is still one stay; stays that do not say which they are stay separate.
  const stays = new Set(
    occurrences
      .filter((n) => n.isStay)
      .map((n, i) => (n.stay ? `${n.stay}\u0000${n.value}` : `#${i}`))
  );
  if (stays.size < 2) {
    return { observations, length: observations[0] };
  }
  const length = occurrences.find((n) => !n.isStay);
  if (!length) return { observations: [] };
  return { observations, length: toObservation(length) };
}

export const nightsRule: ExtractionRule = {
  key: "nights",
  apply(text: string): RuleResult {
    const { observations, length: first } = readNights(text);
    if (!first) return { facts: {}, warnings: [] };

    return {
      facts: { nights: exact(first.value, first.evidence) },
      warnings: [],
      observations: { nights: observations },
    };
  },
};
