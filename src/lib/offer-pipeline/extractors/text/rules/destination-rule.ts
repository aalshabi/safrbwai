/**
 * DestinationRule — a TWO-TIER extractor.
 *
 *  Tier 1 — curated dictionary (`data/destinations.ts`): an alias match yields a
 *           standard name + ISO country code (`matchType: "canonical_alias"`).
 *           Adding a destination is a DATA edit; this file never changes.
 *
 *  Tier 2 — explicit-mention fallback: when nothing matches the dictionary, a
 *           destination is taken ONLY from an explicit travel marker
 *           ("إلى …", "الوجهة: …", "trip to …"). The wording is reported
 *           verbatim with `matchType: "explicit_mention"` and NO invented
 *           standard name or country.
 *
 * Free-text place guessing is never attempted: without a marker nothing is
 * extracted, so an unlisted destination is surfaced honestly rather than
 * fabricated or silently lost.
 */

import type { OfferDestination } from "@/lib/offer-pipeline/types";
import type { ExtractionRule, RuleResult } from "../rule";
import { exact } from "../utils";
import { DESTINATIONS } from "@/lib/offer-pipeline/data/destinations";

/** Explicit "this is the destination" markers. */
const MARKERS: RegExp[] = [
  /(?:الوجهة|وجهة)\s*[:：]\s*/g,
  /(?:السفر|الرحلة|رحلة|عرض|باقة|برنامج)?\s*إلى\s+/g,
  /\bdestination\s*[:：]\s*/gi,
  /\b(?:trip|travel|journey|flight)\s+to\s+/gi,
  /\bto\s+/gi,
];

/**
 * Words that end a destination phrase. They start the NEXT clause of an offer
 * ("… إلى دبي لمدة ٥ ليالٍ"), so capture must stop before them.
 */
const STOP_WORDS = [
  "لمدة", "مدة", "لشخصين", "لشخص", "لفردين", "يشمل", "تشمل", "شامل", "شاملة", "السعر", "بسعر",
  "سعر", "من", "في", "مع", "ليالٍ", "ليالي", "ليلة", "أيام", "يوم", "بالطيران", "طيران",
  "فندق", "إقامة", "للشخص", "ابتداءً", "تبدأ", "خلال",
  "for", "from", "includes", "including", "price", "nights", "night", "days", "with", "at",
  "starting", "per", "hotel", "stay", "on",
  // A transit point is not part of the destination's name ("Nuuk via Istanbul").
  "via", "عبر", "ترانزيت", "transit", "layover", "stopover", "connecting", "connection", "stop", "stopping",
  "change", "planes",
];

/** Phrases where a following "إلى/to" is NOT introducing a destination. */
const MARKER_BLOCKLIST = ["بالإضافة", "إضافة", "اضافة", "تصل", "يصل", "up", "close", "next"];

/**
 * Facility nouns that follow "إلى/to" without naming a place: "من وإلى المطار"
 * describes a transfer, not where the traveller is going. Deliberately limited
 * to facilities — a word that could begin a real place name (مدينة، جزيرة…) is
 * NOT listed, so "إلى المدينة المنورة" is never lost.
 */
const NOT_A_DESTINATION = new Set([
  "المطار", "مطار", "المطارات", "الفندق", "فندق", "المنتجع", "منتجع", "الشقة", "الغرفة",
  "المسبح", "الصالة", "البوابة", "السكن", "المبنى",
  "airport", "airports", "hotel", "hotels", "resort", "room", "lobby", "gate", "terminal",
  "station", "pool", "building",
]);

const LEADING_ARTICLE = /^(?:the|a|an)$/i;

function namesAFacility(value: string): boolean {
  const words = value.split(/\s+/).filter(Boolean);
  // "to the airport" — look past an English article, which Arabic attaches.
  const first = (LEADING_ARTICLE.test(words[0] ?? "") ? words[1] : words[0])?.toLowerCase() ?? "";
  return NOT_A_DESTINATION.has(first);
}

const MAX_WORDS = 4;
const MAX_CHARS = 40;

/**
 * An alias must not end in the middle of a longer word: "الهند" inside
 * "الهندسة" and "قطر" inside "القطرية" are not destinations.
 *
 * Only the END is checked. Arabic attaches single-letter prefixes to place
 * names ("بدبي", "ودبي", "لدبي"), so requiring a boundary before the alias
 * would lose real matches — while requiring one after it costs nothing.
 */
function endsOnAWordBoundary(haystack: string, index: number, length: number): boolean {
  const next = haystack[index + length];
  return next === undefined || !/[\p{L}\p{N}]/u.test(next);
}

/**
 * Latin script attaches no prefixes, so an English alias must also START on a
 * word boundary: "male" inside "female" is not Malé.
 */
function startsOnAWordBoundary(haystack: string, index: number, alias: string): boolean {
  if (!/^[a-z]/i.test(alias)) return true;
  const previous = haystack[index - 1];
  return previous === undefined || !/[\p{L}\p{N}]/u.test(previous);
}

/**
 * An airline carries a country adjective in its name — "الخطوط السعودية",
 * "الخطوط التركية", "Qatar Airways". The carrier is not where the traveller is
 * going, so a country match introduced by one of these is discarded.
 */
const CARRIER_BEFORE = /(?:الخطوط|خطوط|طيران|شركة|على متن)\s*$/;
const CARRIER_AFTER = /^\s*(?:airways|airlines|air\b)/i;

function namesACarrier(haystack: string, index: number, length: number): boolean {
  return (
    CARRIER_BEFORE.test(haystack.slice(Math.max(0, index - 14), index)) ||
    CARRIER_AFTER.test(haystack.slice(index + length))
  );
}

type Match = { entry: (typeof DESTINATIONS)[number]; index: number; length: number; marker: number };

const DESTINATION_MARKER = /(?:إلى|الى|الوجهة\s*[:：]|وجهة\s*[:：]|\bto|\bdestination\s*[:：])\s*$/i;
/** «من» / "from" as a whole word — «يتضمن» merely ends in «من». */
const ORIGIN_MARKER = /(?:^|[^\p{L}])(?:و?من|from)\s*$/iu;

/**
 * A place the traveller only passes through: "via Kuala Lumpur", «عبر إسطنبول»,
 * «ترانزيت في الدوحة», "layover in Doha", also through the city's airport ("via the
 * Istanbul airport", «عبر مطار إسطنبول»). A bare "through" is not one: "a tour
 * through Dubai old town" is sightseeing.
 */
const TRANSIT_MARKER =
  /(?:(?:^|[^\p{L}])(?:عبر|ترانزيت(?:\s+(?:في|ب))?|(?:تغيير|تبديل)\s+(?:ال)?طائرة\s+(?:في|ب)|توقف(?:\s+(?:في|ب))?|مرورًا\s+ب|بالمرور\s+(?:على|ب))|\b(?:via|(?:layover|stopover|transit|connection|connecting)(?:\s+flights?)?(?:\s+(?:in|at|through|via))?|stop(?:s|ping)?\s+(?:over\s+)?(?:in|at)|chang(?:e|es|ing)\s+(?:of\s+)?(?:planes?|flights?|aircraft)\s+(?:in|at)))(?:\s+(?:the|airport|of)\b|\s*(?:ال)?مطار)*\s*$/iu;

/**
 * A route written with a dash from a Saudi city: «الرياض–باريس», "Jeddah - Istanbul",
 * «الرياض-باريس». An unspaced hyphen counts only right after a Saudi city.
 * Only a Saudi departure city marks a route; "Dubai – Abu Dhabi" stays a
 * two-city trip and keeps the usual ranking.
 */
const DASH = "(?:[–—→]|\\s-\\s)";
const SAUDI_ALIASES = DESTINATIONS.filter((entry) => entry.countryCode === "SA" && entry.kind !== "country")
  .flatMap((entry) => entry.aliases)
  .map((alias) => alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const ROUTE_TO = new RegExp(`(?:${SAUDI_ALIASES.join("|")})(?:\\s*${DASH}|-)\\s*$`, "u");
const ROUTE_FROM = new RegExp(`^(?:\\s*${DASH}|-)\\s*\\p{L}`, "u");

/**
 * "من الرياض إلى تبليسي" names two cities. The one after "إلى" is where the
 * traveller is going; the one after "من" is where they leave from and must
 * never be reported as the destination. In a dashed route the first city is
 * the origin and the second the destination. A transit point ranks -1.
 */
function markerRank(haystack: string, index: number, length: number, saudi = false): number {
  const before = haystack.slice(Math.max(0, index - 24), index);
  if (TRANSIT_MARKER.test(before) || inTransitList(haystack, index)) return -1;
  if (DESTINATION_MARKER.test(before) || ROUTE_TO.test(before)) return 2;
  if (ORIGIN_MARKER.test(before)) return 0;
  if (saudi && ROUTE_FROM.test(haystack.slice(index + length, index + length + 4))) return 0;
  return 1;
}

/** A city joined by "and"/"or" to a transit city ("via Istanbul and Singapore", «عبر إسطنبول وسنغافورة») is a transit too. */
function inTransitList(haystack: string, index: number): boolean {
  // «وأبوظبي» → «و أبوظبي», so an attached «و» joins the list like "and".
  const head = haystack.slice(Math.max(0, index - 160), index).replace(/(^|\s)و(?=\p{L})/gu, "$1و ");
  return listedAfterTransit(head, 0);
}

/** Whether `head` ends with "and"/«و» after a list that a transit marker opens ("via A and B and"). */
function listedAfterTransit(head: string, depth: number): boolean {
  const joined = head.match(/^(.*?)(?:\s+(?:and|or|&)|\s+(?:أو|و))\s*$/su);
  if (!joined || depth > 5) return false;
  const words = joined[1].split(/\s+/);
  // Each listed transit city is one to three words long.
  for (let n = 1; n <= Math.min(3, words.length - 1); n++) {
    const city = words.slice(-n).join(" ");
    if (/[\d,،;؛.]/.test(city)) break;
    const rest = words.slice(0, -n).join(" ");
    if (TRANSIT_MARKER.test(rest.slice(-24)) || listedAfterTransit(rest, depth + 1)) return true;
  }
  return false;
}

/** Better = stronger marker first, then the longer alias. */
function outranks(a: Match, b: Match | null): boolean {
  if (!b) return true;
  if (a.marker !== b.marker) return a.marker > b.marker;
  return a.length > b.length;
}

/**
 * Tier-1 selection. A CITY outranks a COUNTRY: an offer that says "فندق في
 * تبليسي … على الخطوط السعودية" is going to Tbilisi, and picking the longest
 * alias anywhere in the text would answer "Saudi Arabia". Within the same
 * rank the longest alias still wins, so "أبو ظبي" is not shadowed.
 */
function findCanonical(text: string): Match | null {
  const haystack = text.toLowerCase();
  let city: Match | null = null;
  let country: Match | null = null;
  // Where each transit city ends, so its country right after it on the same
  // line ("via Istanbul, Turkey", «عبر إسطنبول، تركيا») is read as part of it.
  const transitCities = DESTINATIONS.filter((entry) => entry.kind !== "country").flatMap((entry) =>
    entry.aliases.flatMap((alias) =>
      occurrences(haystack, alias.toLowerCase())
        .filter((i) => markerRank(haystack, i, alias.length, entry.countryCode === "SA") === -1)
        .map((i) => ({ end: i + alias.length, countryCode: entry.countryCode }))
    )
  );
  const qualifiesATransitCity = (entry: (typeof DESTINATIONS)[number], index: number) =>
    transitCities.some(
      (city) => city.countryCode === entry.countryCode && city.end <= index && TRANSIT_COUNTRY_GAP.test(haystack.slice(city.end, index))
    );

  for (const entry of DESTINATIONS) {
    // A place named as a transit point is not where the traveller is going.
    // Only the marked occurrence is dropped, plus its airport mentions
    // («مطار إسطنبول» after «عبر إسطنبول»); "Dubai 5 nights … through Dubai old
    // town" keeps Dubai.
    const ranked = entry.aliases.flatMap((alias) =>
      occurrences(haystack, alias.toLowerCase()).map((i) => ({
        index: i,
        rank: markerRank(haystack, i, alias.length, entry.countryCode === "SA"),
        airport: namesAnAirport(haystack, i, alias.length),
      }))
    );
    // Airport mentions after the place is first passed through are that transit; one before it may be the stay.
    // "Transfer to Istanbul Airport" is not a destination marker for Istanbul.
    const firstTransit = ranked.some(({ rank, airport }) => rank === 2 && !airport)
      ? Infinity
      : Math.min(...ranked.filter(({ rank }) => rank === -1).map(({ index }) => index));
    for (const alias of entry.aliases) {
      const needle = alias.toLowerCase();
      // Scan every occurrence: the first may sit inside a longer word.
      const markerOnly = entry.markerOnlyAliases?.includes(alias) ?? false;
      for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + 1)) {
        if (!endsOnAWordBoundary(haystack, index, needle.length)) continue;
        if (!startsOnAWordBoundary(haystack, index, needle)) continue;
        if (entry.kind === "country" && namesACarrier(haystack, index, needle.length)) continue;
        if (entry.kind === "country" && qualifiesATransitCity(entry, index)) continue;

        const marker = markerRank(haystack, index, needle.length, entry.countryCode === "SA" && entry.kind !== "country");
        // Where the traveller leaves from, or only passes through, is never where they are going.
        if (marker <= 0) continue;
        if (index > firstTransit && namesAnAirport(haystack, index, needle.length)) continue;
        if (markerOnly && marker !== 2) continue;

        const hit: Match = { entry, index, length: alias.length, marker };
        if (entry.kind === "country") {
          if (outranks(hit, country)) country = hit;
        } else if (outranks(hit, city)) {
          city = hit;
        }
        break;
      }
    }
  }
  if (city && country) {
    // A city sitting INSIDE a longer country alias is not a separate mention:
    // "سلطنة عمان" contains "عمان" (Amman), and the whole phrase is the answer.
    if (contains(country, city)) return country;
  }
  return city ?? country;
}

/** «مطار إسطنبول», "Istanbul airport". */
/** "Istanbul Airport", "Istanbul International Airport", "Istanbul Sabiha Gokcen International Airport". */
const AIRPORT_AFTER = /^\s*(?:[\p{L}.]+\s+){0,5}airport\b/iu;

/** Between a transit city and its country: nothing, a comma, or the city's airport ("Istanbul International Airport, Turkey"). */
const TRANSIT_COUNTRY_GAP = /^[ \t]*(?:(?:[\p{L}.]+[ \t]+){0,5}airport|الدولي)?[ \t]*[,،(\-–]?[ \t]*$/iu;

function namesAnAirport(haystack: string, index: number, length: number): boolean {
  return /(?:مطار|airport)\s*$/u.test(haystack.slice(Math.max(0, index - 8), index)) || AIRPORT_AFTER.test(haystack.slice(index + length));
}

/** Every whole-word index of `needle` in `haystack`. */
function occurrences(haystack: string, needle: string): number[] {
  const found: number[] = [];
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + 1)) {
    if (endsOnAWordBoundary(haystack, index, needle.length) && startsOnAWordBoundary(haystack, index, needle)) found.push(index);
  }
  return found;
}

function contains(outer: Match, inner: Match): boolean {
  return outer.index <= inner.index && inner.index + inner.length <= outer.index + outer.length;
}

/** Trim a captured tail down to a short, plausible destination phrase. */
function trimToDestination(tail: string): string {
  // Stop at the first clause boundary.
  const clause = tail.split(/[،,.\n\r؛;:()]/)[0] ?? "";

  const words: string[] = [];
  for (const word of clause.trim().split(/\s+/)) {
    const bare = word.replace(/[^\p{L}\p{N}\-']/gu, "");
    if (!bare) break;
    if (STOP_WORDS.includes(bare.toLowerCase())) break;
    // A number starts the "5 nights" clause — never part of a destination.
    if (/^\d+$/.test(bare)) break;
    words.push(bare);
    if (words.length >= MAX_WORDS) break;
  }

  return words.join(" ").slice(0, MAX_CHARS).trim();
}

function findExplicit(text: string): { value: string; evidence: string } | null {
  for (const marker of MARKERS) {
    marker.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = marker.exec(text)) !== null) {
      const before = text.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
      if (MARKER_BLOCKLIST.some((b) => before.includes(b.toLowerCase()))) continue;

      const tail = text.slice(m.index + m[0].length);
      const value = trimToDestination(tail);
      if (!value || namesAFacility(value)) continue;

      // Evidence covers the marker plus the captured destination.
      return { value, evidence: text.slice(m.index, m.index + m[0].length + value.length).trim() };
    }
  }
  return null;
}

export const destinationRule: ExtractionRule = {
  key: "destination",
  apply(text: string): RuleResult {
    // Tier 1 — curated dictionary.
    const known = findCanonical(text);
    if (known) {
      const evidence = text.slice(known.index, known.index + known.length);
      const value: OfferDestination = {
        value: evidence,
        canonicalValue: known.entry.canonical,
        countryCode: known.entry.countryCode,
        matchType: "canonical_alias",
      };
      return { facts: { destination: exact(value, evidence) }, warnings: [] };
    }

    // Tier 2 — explicit mention only.
    const explicit = findExplicit(text);
    if (explicit) {
      const value: OfferDestination = { value: explicit.value, matchType: "explicit_mention" };
      return {
        facts: { destination: exact(value, explicit.evidence) },
        warnings: [
          {
            ar: `الوجهة «${explicit.value}» مذكورة صراحةً لكنها غير مرتبطة باسم جغرافي قياسي.`,
            en: `Destination "${explicit.value}" is explicitly stated but not matched to a standard geographic name.`,
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
