/**
 * Airport-status configuration. Adding a Saudi airport (e.g. AHB, GIZ, EAM)
 * means adding one entry to SAUDI_AIRPORTS; no component changes.
 */

import type { LinkRef } from "./types";

export interface ConfiguredAirport {
  airportCode: string;
  cityAr: string;
  airportNameAr: string;
  /** Official page to check when there is no current verified record. */
  officialLink: LinkRef;
}

const GACA: LinkRef = { name: "GACA", url: "https://www.gaca.gov.sa/" };

/** Saudi airports always shown, in this order. */
export const SAUDI_AIRPORTS: readonly ConfiguredAirport[] = [
  { airportCode: "RUH", cityAr: "الرياض", airportNameAr: "مطار الملك خالد الدولي", officialLink: { name: "KKIA", url: "https://www.kkia.sa/en/flights/departures-and-arrivals" } },
  { airportCode: "JED", cityAr: "جدة", airportNameAr: "مطار الملك عبدالعزيز الدولي", officialLink: GACA },
  { airportCode: "DMM", cityAr: "الدمام", airportNameAr: "مطار الملك فهد الدولي", officialLink: { name: "KFIA", url: "https://kfia.sa/Flights" } },
  { airportCode: "MED", cityAr: "المدينة المنورة", airportNameAr: "مطار الأمير محمد بن عبدالعزيز الدولي", officialLink: GACA },
];

/** Most global disruptions listed. */
export const GLOBAL_LIMIT = 5;

/** A record without expiresAt becomes stale this long after observedAt. */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

/** expiresAt is capped at observedAt + this. */
export const MAX_VALIDITY_MS = 24 * 60 * 60 * 1000;

/** "مباشر" is shown only while the newest data is at most this old. */
export const LIVE_MAX_AGE_MS = 10 * 60 * 1000;

/** Records for one airport this close to the newest are compared for conflicts. */
export const CONFLICT_WINDOW_MS = 90 * 60 * 1000;

/**
 * Hosts approved to evidence a suspension, besides any government
 * (`*.gov`, `*.gov.xx`) host. Airport operators and airlines must be added
 * here explicitly, by a person, before their notices can mark "suspended".
 */
export const APPROVED_AUTHORITY_HOSTS: readonly string[] = ["kkia.sa", "kfia.sa", "eurocontrol.int", "icao.int"];
