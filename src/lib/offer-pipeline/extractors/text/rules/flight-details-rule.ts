/**
 * FlightDetailsRule — preserves explicit transit duration, stop count and
 * airport-change statements. Missing or qualified information stays absent;
 * the analysis layer can then ask for clarification without inventing facts.
 */

import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import type { ExtractionRule, RuleResult } from "../rule";
import { exact, toWesternDigits } from "../utils";

const AR_DURATION =
  /(?:ترانزيت|توقف|تتوقف|التوقف|عبور)[^.،\n]{0,45}?(?:لمدة\s*)?(\d+(?:\.\d+)?)\s*(ساعة|ساعات|دقيقة|دقائق)/i;
const EN_DURATION =
  /(?:layover|stopover|transit|stops?)[^.\n]{0,45}?(?:for\s*)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i;
const AR_DURATION_FIRST =
  /(\d+(?:\.\d+)?)\s*(ساعة|ساعات|دقيقة|دقائق)[^.،\n]{0,20}?(?:ترانزيت|توقف|عبور)/i;
const EN_DURATION_FIRST =
  /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)[^.\n]{0,20}?(?:layover|stopover|transit)/i;
const AR_EXPLICIT_STOPS = /(?:عدد\s+التوقفات\s*[:：]?\s*)?(\d+)\s*(?:توقفات|توقف)/i;
const EN_EXPLICIT_STOPS = /(\d+)\s+(?:flight\s+)?stops?\b/i;
const AR_ONE_STOP = /(?:توقف\s+واحد|تتوقف\s+في\s+[\p{L}\-']+(?:\s+[\p{L}\-']+){0,2})/iu;
const EN_ONE_STOP = /(?:one\s+stop|stops?\s+in\s+[\p{L}\-']+(?:\s+[\p{L}\-']+){0,2})/iu;

const AIRPORT_CHANGE_UNKNOWN =
  /(?:لا\s*(?:يذكر|تذكر|توجد\s+معلومات)|غير\s*مذكور)[^.،\n]{0,35}?تغيير\s*(?:ال)?مطار|(?:not\s+(?:stated|specified|mentioned)|no\s+information)[^.\n]{0,35}?airport\s+change|airport\s+change[^.\n]{0,20}?not\s+(?:stated|specified|mentioned)/i;
const NO_AIRPORT_CHANGE =
  /(?:لا\s+يوجد|دون|بدون|لا\s+يتطلب)\s+تغيير\s*(?:ال)?مطار|(?:no|without)\s+(?:an?\s+)?airport\s+change|same\s+airport/i;
const AIRPORT_CHANGE =
  /(?:يتطلب|يلزم|مع)\s+تغيير\s*(?:ال)?مطار|تبديل\s*(?:ال)?مطار|(?:requires?|with)\s+(?:an?\s+)?airport\s+change|change\s+airports?/i;

function durationFact(original: string, normalized: string) {
  const match =
    AR_DURATION.exec(normalized) ??
    EN_DURATION.exec(normalized) ??
    AR_DURATION_FIRST.exec(normalized) ??
    EN_DURATION_FIRST.exec(normalized);
  if (!match || match.index === undefined) return undefined;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  const unit = (match[2] ?? "").toLowerCase();
  const minutes = /دقيقة|دقائق|minute|min/.test(unit) ? numeric : numeric * 60;
  const evidence = original.slice(match.index, match.index + match[0].length).trim();
  return exact({ minutes }, evidence);
}

function stopCountFact(original: string, normalized: string) {
  const explicit = AR_EXPLICIT_STOPS.exec(normalized) ?? EN_EXPLICIT_STOPS.exec(normalized);
  if (explicit?.index !== undefined) {
    const value = Number(explicit[1]);
    if (Number.isInteger(value) && value >= 0) {
      const evidence = original.slice(explicit.index, explicit.index + explicit[0].length).trim();
      return exact(value, evidence);
    }
  }

  const singular = AR_ONE_STOP.exec(normalized) ?? EN_ONE_STOP.exec(normalized);
  if (singular?.index !== undefined) {
    const evidence = original.slice(singular.index, singular.index + singular[0].length).trim();
    return exact(1, evidence);
  }

  return undefined;
}

function airportChangeFact(original: string) {
  if (AIRPORT_CHANGE_UNKNOWN.test(original)) return undefined;
  const noChange = NO_AIRPORT_CHANGE.exec(original);
  if (noChange?.index !== undefined) return exact(false, noChange[0].trim());
  const change = AIRPORT_CHANGE.exec(original);
  if (change?.index !== undefined) return exact(true, change[0].trim());
  return undefined;
}

export const flightDetailsRule: ExtractionRule = {
  key: "flightDetails",
  apply(text: string): RuleResult {
    const normalized = toWesternDigits(text);
    const facts: Partial<ExtractedOfferFacts> = {};
    const transitDuration = durationFact(text, normalized);
    const stopCount = stopCountFact(text, normalized);
    const airportChange = airportChangeFact(text);
    if (transitDuration) facts.transitDuration = transitDuration;
    if (stopCount) facts.stopCount = stopCount;
    if (airportChange) facts.airportChange = airportChange;
    return { facts, warnings: [] };
  },
};
