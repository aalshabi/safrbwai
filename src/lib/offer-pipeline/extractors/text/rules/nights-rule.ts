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

export function extractNightObservations(text: string): NightObservation[] {
  const normalizedText = toWesternDigits(text);
  const occurrences: NightObservation[] = [];

  for (const match of normalizedText.matchAll(NIGHTS)) {
    if (match.index === undefined) continue;

    // A signed count ("-5 ليالٍ") is not a valid night count: the pattern
    // captures digits only, so the sign is checked explicitly.
    const preceding = normalizedText[match.index - 1];
    if (preceding === "-" || preceding === "−") continue;

    const value = Number(match[1]);
    if (!Number.isInteger(value) || value <= 0) continue;

    occurrences.push({
      value,
      evidence: text.slice(match.index, match.index + match[0].length),
    });
  }

  // A stay split across hotels ("7 ليالٍ" … "4 ليالٍ" … "3 ليالٍ") states its
  // parts beside the total. When the largest count equals the sum of all the
  // other counts, they are its parts, not rival values.
  const largest = occurrences.reduce<NightObservation | undefined>(
    (max, n) => (!max || n.value > max.value ? n : max),
    undefined
  );
  if (largest) {
    const parts = occurrences.filter((n) => n !== largest);
    const sum = parts.reduce((total, n) => total + n.value, 0);
    if (parts.length >= 2 && parts.every((n) => n.value < largest.value) && sum === largest.value) {
      return [largest];
    }
  }

  const seen = new Set<number>();
  return occurrences.filter((n) => {
    if (seen.has(n.value)) return false;
    seen.add(n.value);
    return true;
  });
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
