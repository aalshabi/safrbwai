/**
 * FlightDetailsRule — preserves explicit transit duration, stop count and
 * airport-change statements. Missing or qualified information stays absent;
 * the analysis layer can then ask for clarification without inventing facts.
 */

import { SAUDI_AIRPORTS } from "@/lib/airport-status/config";
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

const EXPLICIT_TRANSIT_CONTEXT = /(?:ترانزيت|عبور|layover|stopover|\btransit\b)/i;
const FLIGHT_CONTEXT =
  /(?:رحلة\s+(?:جوية|الذهاب|العودة)|مسار\s+الرحلة|الطيران|طيران)|\b(?:flight|flights|airline|airfare|outbound|inbound)\b/i;
const GROUND_STOP_CONTEXT =
  /(?:حافلة|الحافلة|باص|خدمة\s+النقل|النقل\s+البري|المواصلات|جولة\s+سياحية)|\b(?:bus|shuttle|coach|ground\s+transport|airport\s+transfer|sightseeing|tour)\b/i;

const AIRPORT_CHANGE_UNKNOWN =
  /(?:لا\s*(?:يذكر|تذكر|توجد\s+معلومات)|غير\s*مذكور)[^.،\n]{0,35}?تغيير\s*(?:ال)?مطار|(?:not\s+(?:stated|specified|mentioned)|no\s+information)[^.\n]{0,35}?airport\s+change|airport\s+change[^.\n]{0,20}?not\s+(?:stated|specified|mentioned)/i;
const NO_AIRPORT_CHANGE =
  /(?:لا\s+يوجد|دون|بدون|لا\s+يتطلب)\s+تغيير\s*(?:ال)?مطار|(?:no|without)\s+(?:an?\s+)?airport\s+change|same\s+airport/i;
const AIRPORT_CHANGE =
  /(?:يتطلب|يلزم|مع)\s+تغيير\s*(?:ال)?مطار|تبديل\s*(?:ال)?مطار|(?:requires?|with)\s+(?:an?\s+)?airport\s+change|change\s+airports?/i;

function clauseAt(text: string, index: number): { text: string; matchIndex: number } {
  const before = text.slice(0, index);
  const clauseStart = Math.max(
    before.lastIndexOf("."),
    before.lastIndexOf("!"),
    before.lastIndexOf("?"),
    before.lastIndexOf("؟"),
    before.lastIndexOf("،"),
    before.lastIndexOf(","),
    before.lastIndexOf("؛"),
    before.lastIndexOf(";"),
    before.lastIndexOf("\n")
  ) + 1;
  const after = text.slice(index);
  const nextDelimiter = after.search(/[.!?؟،,؛;\n]/);
  const clauseEnd = nextDelimiter === -1 ? text.length : index + nextDelimiter;
  return {
    text: text.slice(clauseStart, clauseEnd),
    matchIndex: index - clauseStart,
  };
}

function nearestContextDistance(text: string, index: number, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...text.matchAll(new RegExp(pattern.source, flags))].reduce((nearest, match) => {
    if (match.index === undefined) return nearest;
    const start = match.index;
    const end = start + match[0].length;
    const distance = index < start ? start - index : index > end ? index - end : 0;
    return Math.min(nearest, distance);
  }, Number.POSITIVE_INFINITY);
}

/** A flight routed through another city ("via Doha", «عبر إسطنبول»): a bare «توقف ١٤ ساعة» elsewhere in it is that stop. */
const ROUTED_VIA = /(?:^|[^\p{L}])(?:عبر|ترانزيت)\s+\p{L}|\b(?:via|layover|stopover)\b/iu;

/**
 * A stop whose duration sits right beside it, naming no place: «توقف 14 ساعة»,
 * «14 ساعة توقف», "layover 7 hours", "7 hours layover".
 */
const UNNAMED_STOP =
  /^(?:(?:ترانزيت|توقف|التوقف|layover|stopover|transit)\s*(?:لمدة|for)?\s*[\d٠-٩۰-۹]|[\d٠-٩۰-۹]+(?:[.٫][\d٠-٩۰-۹]+)?\s*(?:ساعة|ساعات|دقيقة|دقائق|hours?|hrs?|minutes?|mins?)\s*(?:ترانزيت|توقف|layover|stopover|transit))/i;
const SIGHTSEEING_STOP = /توقف\s+عند|زيارة|\b(?:visit|stop\s+at)\b/i;
/**
 * A stop placed somewhere after its duration («توقف 3 ساعات في الفندق», «… في
 * وسط المدينة», "in the old town") names its place, so it is not the routed
 * flight's unnamed stop. Only the airport itself keeps it a flight stop.
 */
const PLACED_STOP =
  /(?:^|[^\p{L}])(?:في|داخل|عند|at|in|inside)\s+(?!(?:ال)?مطار|(?:ال)?صالة|(?:the\s+)?(?:airport|terminal))/iu;

/** The sentence around `index`: up to the nearest full stop or line break. */
function sentenceAt(text: string, index: number): string {
  const before = text.slice(0, index);
  const start = Math.max(...[".", "!", "?", "؟", "\n"].map((mark) => before.lastIndexOf(mark))) + 1;
  const rest = text.slice(index).search(/[.!?؟\n]/);
  return text.slice(start, rest === -1 ? text.length : index + rest);
}

function hasAviationContext(text: string, index: number): boolean {
  const clause = clauseAt(text, index);
  // A routed flight («… عبر إسطنبول، توقف 14 ساعة») names its stop in the same
  // sentence; a stop "at" or "in" a place («توقف عند برج خليفة», «توقف 3
  // ساعات في وسط المدينة») or with ground transport is not that stop.
  if (
    ROUTED_VIA.test(sentenceAt(text, index)) &&
    UNNAMED_STOP.test(text.slice(index)) &&
    !PLACED_STOP.test(clause.text.slice(clause.matchIndex)) &&
    !GROUND_STOP_CONTEXT.test(clause.text) &&
    !SIGHTSEEING_STOP.test(clause.text)
  ) {
    return true;
  }
  const aviationDistance = Math.min(
    nearestContextDistance(clause.text, clause.matchIndex, EXPLICIT_TRANSIT_CONTEXT),
    nearestContextDistance(clause.text, clause.matchIndex, FLIGHT_CONTEXT)
  );
  const groundDistance = nearestContextDistance(
    clause.text,
    clause.matchIndex,
    GROUND_STOP_CONTEXT
  );
  return aviationDistance < Number.POSITIVE_INFINITY && aviationDistance <= groundDistance;
}

function firstAviationMatch(
  original: string,
  normalized: string,
  patterns: readonly RegExp[]
): RegExpExecArray | undefined {
  return patterns
    .flatMap((pattern) => [
      ...normalized.matchAll(
        new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)
      ),
    ])
    .filter((match) => match.index !== undefined && hasAviationContext(original, match.index))
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))[0];
}

function durationFact(original: string, normalized: string) {
  const match = firstAviationMatch(original, normalized, [
    AR_DURATION,
    EN_DURATION,
    AR_DURATION_FIRST,
    EN_DURATION_FIRST,
  ]);
  if (!match || match.index === undefined) return undefined;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  const unit = (match[2] ?? "").toLowerCase();
  const minutes = /دقيقة|دقائق|minute|min/.test(unit) ? numeric : numeric * 60;
  const evidence = original.slice(match.index, match.index + match[0].length).trim();
  return exact({ minutes }, evidence);
}

function stopCountFact(original: string, normalized: string) {
  const explicit = firstAviationMatch(original, normalized, [AR_EXPLICIT_STOPS, EN_EXPLICIT_STOPS]);
  if (explicit?.index !== undefined) {
    const value = Number(explicit[1]);
    if (Number.isInteger(value) && value >= 0) {
      const evidence = original.slice(explicit.index, explicit.index + explicit[0].length).trim();
      return exact(value, evidence);
    }
  }

  const singular = firstAviationMatch(original, normalized, [AR_ONE_STOP, EN_ONE_STOP]);
  if (singular?.index !== undefined) {
    const evidence = original.slice(singular.index, singular.index + singular[0].length).trim();
    return exact(1, evidence);
  }

  return undefined;
}

/** An airport name after «مطار»: up to six words («الأمير محمد بن عبدالعزيز الدولي»), stopping at a clause break or «و». */
/** Words that follow an airport name without being part of it: times, days, the next leg. */
const AFTER_AIRPORT_NAME =
  "و?(?:المغادرة|الإقلاع|مغادرة)|و|في|يوم|اليوم|الساعة|ساعة|صباح|مساء|ظهر|عصر|ليل|فجر|بعد|قبل|عند|ثم|على|من|إلى|الى|حيث|لمدة" +
  // route and terminal qualifiers: «عبر الصالة 1», «مبنى 3», «بوابة»
  "|عبر|الصالة|صالة|المبنى|مبنى|البوابة|بوابة|رقم|رحلة|الرحلة";
const AR_AIRPORT_NAME = `مطار\\s+((?:(?!(?:${AFTER_AIRPORT_NAME})(?![\\p{L}\\p{M}]))(?!(?:صباح|مساء|ظهر|ليل)[\\p{L}]*)[\\p{L}\\p{M}\\-']+\\s*){1,6})`;
/** «الوصول إلى مطار صبيحة … المغادرة من مطار إسطنبول» — arriving and leaving through two named airports. */
const AR_ARRIVE_DEPART = new RegExp(
  `(?:الوصول|وصول|الهبوط)\\s*(?:إلى|الى|في)\\s*${AR_AIRPORT_NAME}[^.\\n]{0,40}?(?:المغادرة|مغادرة|الإقلاع)\\s*(?:من)\\s*${AR_AIRPORT_NAME}`,
  "u"
);
const EN_ARRIVE_DEPART =
  /arriv(?:e|es|al|ing)\s+(?:at|in|into)\s+((?:[\p{L}\-'.]+\s+){1,6})airport[^.\n]{0,40}?depart(?:s|ure|ing)?\s+from\s+((?:[\p{L}\-'.]+\s+){1,6})airport/iu;

/** «مطار دبي الدولي», «مطار دُبي» and «مطار دبي» are one airport. */
const airportKey = (name: string) =>
  name
    .replace(/\p{M}/gu, "")
    .replace(/[.'’\-]/g, " ")
    .toLowerCase()
    .replace(/(?:^|\s)(?:الدولي|الدولية|international|intl)(?=\s|$)/gu, " ")
    .replace(/(?:^|\s)ال/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Saudi airports by code, city and official name, so «مطار الرياض» and "RUH" are «مطار الملك خالد». */
const KNOWN_AIRPORTS = new Map(
  SAUDI_AIRPORTS.flatMap(({ airportCode, cityAr, airportNameAr }) =>
    [airportCode, cityAr, airportNameAr.replace(/^مطار\s+/u, "")].map((name) => [airportKey(name), airportCode] as const)
  )
);
const IATA_CODE = /^[a-z]{3}$/;

/**
 * Whether two airport names are different airports: undefined when that
 * cannot be told from the names alone, as with a code beside a name
 * ("King Khalid" and "RUH") that no known alias links.
 */
function differentAirports(first: string, second: string): boolean | undefined {
  const [a, b] = [airportKey(first), airportKey(second)];
  const [knownA, knownB] = [KNOWN_AIRPORTS.get(a), KNOWN_AIRPORTS.get(b)];
  if (knownA && knownB) return knownA !== knownB;
  if (IATA_CODE.test(a) && IATA_CODE.test(b)) return a !== b;
  if (IATA_CODE.test(a) || IATA_CODE.test(b)) return undefined;
  // A name with its city in front is the same airport ("London Heathrow" /
  // "Heathrow"); a city followed by another name is a second airport there
  // («دبي» / «دبي آل مكتوم»).
  if (a.endsWith(` ${b}`) || b.endsWith(` ${a}`)) return undefined;
  return a !== b;
}

function airportChangeFact(original: string) {
  // Two different named airports for arrival and departure: the change is stated by the names themselves.
  const pair = AR_ARRIVE_DEPART.exec(original) ?? EN_ARRIVE_DEPART.exec(original);
  // Only the generic words airportKey drops are ignored: «مطار دبي آل مكتوم» is another airport.
  const namedChange = pair ? differentAirports(pair[1], pair[2]) : undefined;
  // "Airport change not stated" says nothing the named airports do not settle.
  if (AIRPORT_CHANGE_UNKNOWN.test(original)) return pair && namedChange ? exact(true, pair[0].trim()) : undefined;
  const noChange = NO_AIRPORT_CHANGE.exec(original);
  // "No airport change" beside two different named airports contradicts itself: neither is confirmed.
  if (noChange?.index !== undefined) return namedChange ? undefined : exact(false, noChange[0].trim());
  const change = AIRPORT_CHANGE.exec(original);
  // …and "airport change" beside the same airport named twice does too.
  if (change?.index !== undefined) return namedChange === false ? undefined : exact(true, change[0].trim());
  if (pair && namedChange) return exact(true, pair[0].trim());
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
