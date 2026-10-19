/**
 * NightsRule — extracts an explicit number of nights. Only "nights"/"ليالٍ"
 * units are accepted; a count of days is NOT treated as nights (no inference).
 */

import type { OfferObservations } from "@/lib/offer-pipeline/analysis/types";
import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

// e.g. "5 ليالٍ", "٥ ليال", "لمدة 5 ليالي", "5 nights", "5-night" — or a count
// written as words: «ليلة واحدة» (1), «ليلتان/ليلتين» (2), "one night", "two nights".
const NIGHTS =
  /(\d{1,3})[\s-]*(?:ليال(?:ٍ|ي)?|ليلة|nights?)|(ليلة\s+واحدة|ليلتان|ليلتين|\bone\s+night\b|\btwo\s+nights\b)/gi;

function wordCount(word: string): number {
  return /ليلة\s+واحدة|one/i.test(word) ? 1 : 2;
}

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
 * The rest of a list line naming where the nights are spent — a hotel, its
 * stars or its board ("- باتومي، 3 ليالٍ: New Wave Hotel 4★، شامل الإفطار").
 */
const HOTEL_AFTER =
  /^[^\n]*(?:★|نجوم|نجمة|فندق|منتجع|فيلا|شامل\s+الإفطار|\bhotel\b|\bresort\b|\binn\b|\blodge\b|\bvilla\b)/iu;

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

/**
 * Words that say a count is a stay but not WHICH stay it is. The property
 * type stays in the name ("Hotel Marina" and "Marina Resort" are two stays),
 * with Arabic's article dropped so «الفندق X» and «فندق X» match.
 */
const GENERIC_STAY_WORDS =
  /(?:^|\s)(?:الإقامة|إقامة|اقامة|مدة|لمدة|stay|accommodation|the|for|of)(?=\s|$)/giu;
/**
 * Where a stay is spent, right after its count ("4 nights in Dubai", «في دبي»,
 * «بدبي»). It ends at «و»/"and" or a colon, so a label that follows ("… in
 * Rome and Total: 7 nights") stays with the next count.
 */
const PLACE_AFTER =
  /^\s*(?:(?:في|in|at)\s+|ب\s*)([^\d,،؛;\n|.:]+?)(?=\s+(?:and\b|و(?=\s|\d))|\s*[\d,،؛;\n|.:]|\s*$)/iu;

/**
 * Which stay a count names — "hotel a" for "Hotel A: 4 nights" and "Hotel A
 * stay: 4 nights", «الأولى» for «الإقامة الأولى | 4 ليالٍ», "dubai" for "4 nights in
 * Dubai" — so a stay mentioned twice counts once. Empty when the text does
 * not say which stay it is; such counts are never merged.
 */
function stayName(label: string, after: string): string {
  const named = label
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(GENERIC_STAY_WORDS, " ")
    .replace(/(^|\s)ال(فندق|منتجع)(?=\s|$)/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  const rawPlace = (PLACE_AFTER.exec(after)?.[1] ?? "").trim();
  // «في الفنادق المذكورة» names no particular stay.
  const place = (/^(?:ال)?(?:فنادق|فندق)|^(?:the\s+)?hotels?\b/iu.test(rawPlace) ? "" : rawPlace)
    .toLowerCase()
    .replace(/\s+(?:و|and)\s*$/u, "")
    .replace(/\s+و$/u, "")
    .trim();
  return [named, place].filter(Boolean).join(" @ ");
}

export function extractNightObservations(text: string): NightObservation[] {
  return readNights(text).observations;
}

/** An option heading ("### الخيار الأول — فنادق 4 نجوم", "Option 2:"). */
const OPTION_HEADING = /^[\s#*>-]*(?:الخيار|خيار|option)(?!\p{L})/gimu;

/** How many option headings precede `index` (0 when the offer has none). */
function optionIndex(text: string, index: number): number {
  return [...text.slice(0, index).matchAll(OPTION_HEADING)].length;
}

/**
 * Whether this count's own item names a hotel ("ليلتان: `Royal Kandyan Hotel`").
 * Only the rest of this item counts ("| Hotel A: …" belongs to the next
 * count), and an item holding a later count ("7 nights: Hotel A: 4 nights")
 * gives that hotel to the later count, whose label it is.
 */
function hotelAfter(after: string): boolean {
  const item = after.split(/[\n|;؛]/)[0];
  return HOTEL_AFTER.test(item) && !new RegExp(NIGHTS.source, NIGHTS.flags.replace("g", "")).test(item);
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
    option: number;
  })[] = [];

  let previousEnd = 0;
  for (const match of normalizedText.matchAll(NIGHTS)) {
    if (match.index === undefined) continue;

    // A signed count ("-5 ليالٍ") is not a valid night count: the pattern
    // captures digits only, so the sign is checked explicitly.
    const preceding = normalizedText[match.index - 1];
    if (preceding === "-" || preceding === "−") continue;

    const value = match[1] !== undefined ? Number(match[1]) : wordCount(match[2] ?? "");
    if (!Number.isInteger(value) || value <= 0) continue;

    const end = match.index + match[0].length;
    const label = labelBefore(normalizedText, match.index, previousEnd);
    // The place after a count ("in Dubai") belongs to it, never to the next
    // count's label ("4 nights in Dubai, 4 nights in Dubai").
    previousEnd = end + (PLACE_AFTER.exec(normalizedText.slice(end))?.[0].length ?? 0);
    const onStayLine = STAY_LINE.test(label);
    const after = normalizedText.slice(end);
    occurrences.push({
      value,
      evidence: text.slice(match.index, end),
      onStayLine,
      onTotalLine: TOTAL_LINE.test(label),
      isStay: onStayLine || STAY_AFTER.test(after) || hotelAfter(after),
      stay: stayName(label, after),
      option: optionIndex(normalizedText, match.index),
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
    // The total may be restated ("7 ليالٍ" … "Total: 7 nights", «الإقامة 6
    // ليالٍ مع الإفطار»); an equal count that names no particular stay is that
    // restatement, while one naming a stay ("Stay 1: 7 nights", "7 nights in
    // Dubai") is a part.
    const parts = occurrences.filter(
      (n) => n.value !== candidate.value || (n.isStay && n.stay !== "")
    );
    const sum = (list: typeof parts) => list.reduce((acc, n) => acc + n.value, 0);
    // An offer with options lists one itinerary per option (الخيار الأول:
    // موسكو 3، سانت بطرسبرغ 3 … الخيار الثاني: موسكو 3، سانت بطرسبرغ 3). The
    // options are alternatives, so each option's stays must add up to the
    // total on their own; stays outside any option keep the plain sum.
    const byOption = new Map<number, typeof parts>();
    for (const n of parts) byOption.set(n.option, [...(byOption.get(n.option) ?? []), n]);
    const optionsAgree =
      byOption.size >= 2 &&
      !byOption.has(0) &&
      [...byOption.values()].every((group) => sum(group) === candidate.value);
    return (
      isTotal &&
      parts.length >= 2 &&
      parts.every((n) => n.isStay) &&
      (sum(parts) === candidate.value || optionsAgree)
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
    // A stated length that is not a stay ("Duration: 7 nights") still wins.
    const stated = occurrences.find((n) => !n.isStay);
    return { observations, length: stated ? toObservation(stated) : observations[0] };
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
