/**
 * Normalization and validation of raw provider records. Provider output is
 * untrusted: every field is checked, and anything that cannot be verified is
 * dropped rather than guessed. See status.ts for the mapping rules.
 */

import { APPROVED_AUTHORITY_HOSTS, CONFLICT_WINDOW_MS, MAX_VALIDITY_MS } from "./config";
import { AUTHORITATIVE_TYPES, SEVERITY, isMaterial, isStale, statusFromMetrics } from "./status";
import type {
  AirportStatusRecord,
  Confidence,
  LinkRef,
  OperationalStatus,
  SourceRef,
  SourceType,
  StatusConflict,
} from "./types";

const STATUSES: readonly OperationalStatus[] = ["normal", "minor_delays", "major_disruption", "suspended"];
const SOURCE_TYPES: readonly SourceType[] = [
  "official_airport",
  "civil_aviation_authority",
  "airline_notice",
  "approved_authority",
  "flight_tracker",
  "manual_review",
];
const CONFIDENCES: readonly Confidence[] = ["high", "medium", "low"];
const MAX_RECORDS = 200;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export interface NormalizedFeed {
  records: AirportStatusRecord[];
  conflicts: StatusConflict[];
  /** Newest fetchedAt among accepted records; null when nothing was accepted. */
  lastFetchedAt: string | null;
  issues: string[];
}

export interface NormalizeOptions {
  now: Date;
  /** Accept records flagged `sample: true` (development and tests only). */
  allowSamples: boolean;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Bidi embedding/override/isolate marks could reorder the rendered Arabic.
const BIDI_CONTROLS = /[؜‎‏‪-‮⁦-⁩]/g;

function text(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.replace(BIDI_CONTROLS, "").replace(/\s+/g, " ").trim();
  return t.length > 0 && t.length <= max ? t : undefined;
}

function httpsUrl(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 500) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function link(v: unknown): LinkRef | undefined {
  if (!isObject(v)) return undefined;
  const name = text(v.name, 60);
  const url = httpsUrl(v.url);
  return name && url ? { name, url } : undefined;
}

function source(v: unknown): SourceRef | undefined {
  const l = link(v);
  if (!l || !isObject(v) || !SOURCE_TYPES.includes(v.type as SourceType)) return undefined;
  return { ...l, type: v.type as SourceType };
}

/** Government (`*.gov`, `*.gov.xx`) or an explicitly approved authority host. */
export function isApprovedAuthorityHost(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  if (/(^|\.)gov$/.test(host) || /(^|\.)gov\.[a-z]{2}$/.test(host)) return true;
  return APPROVED_AUTHORITY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

// An explicit zone is required: "2026-10-17T14:00:00" would be read in the
// server's zone, not Riyadh's, and silently shift the time by hours.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

function isoTime(v: unknown, now: Date): string | undefined {
  if (typeof v !== "string" || v.length > 40 || !ISO_WITH_ZONE.test(v)) return undefined;
  const t = Date.parse(v);
  if (Number.isNaN(t) || t > now.getTime() + FUTURE_TOLERANCE_MS) return undefined;
  return new Date(t).toISOString();
}

function num(v: unknown, min: number, max: number, integer = false): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) return undefined;
  return integer && !Number.isInteger(v) ? undefined : v;
}

type Parsed =
  | { kind: "record"; record: AirportStatusRecord }
  | { kind: "unverified_suspension"; airportCode: string; observedAt: string; expiresAt?: string; sourceName: string };

function parseRecord(v: unknown, where: string, opts: NormalizeOptions, issues: string[]): Parsed | null {
  if (!isObject(v)) return issues.push(`${where}: not an object`), null;

  const airportCode = typeof v.airportCode === "string" && /^[A-Z]{3}$/.test(v.airportCode) ? v.airportCode : undefined;
  const countryCode = typeof v.countryCode === "string" && /^[A-Z]{2}$/.test(v.countryCode) ? v.countryCode : undefined;
  const airportNameAr = text(v.airportNameAr, 80);
  const cityAr = text(v.cityAr, 40);
  const src = source(v.source);
  const observedAt = isoTime(v.observedAt, opts.now);
  const fetchedAt = isoTime(v.fetchedAt, opts.now);
  if (!airportCode || !countryCode || !airportNameAr || !cityAr || !src || !observedAt || !fetchedAt) {
    // Name the fields so an editor can fix the record.
    const bad = Object.entries({ airportCode, countryCode, airportNameAr, cityAr, source: src, observedAt, fetchedAt })
      .filter(([, value]) => !value)
      .map(([key]) => key);
    return issues.push(`${where}: missing or invalid ${bad.join(", ")} (times need a zone and must not be in the future)`), null;
  }
  if (Date.parse(fetchedAt) < Date.parse(observedAt) - FUTURE_TOLERANCE_MS) {
    return issues.push(`${where} (${airportCode}): fetchedAt precedes observedAt`), null;
  }
  if (v.sample === true && !opts.allowSamples) {
    return issues.push(`${where} (${airportCode}): sample record rejected outside development`), null;
  }

  const expiresRaw =
    v.expiresAt === undefined ? undefined : typeof v.expiresAt === "string" && ISO_WITH_ZONE.test(v.expiresAt) ? Date.parse(v.expiresAt) : NaN;
  if (expiresRaw !== undefined && (Number.isNaN(expiresRaw) || expiresRaw <= Date.parse(observedAt))) {
    return issues.push(`${where} (${airportCode}): invalid expiresAt`), null;
  }
  // A far-future expiry would keep an old status "current" indefinitely.
  const expiresAt = expiresRaw === undefined ? undefined : Math.min(expiresRaw, Date.parse(observedAt) + MAX_VALIDITY_MS);

  const figure = (key: string, value: number | undefined): number | undefined => {
    if (v[key] !== undefined && value === undefined) issues.push(`${where} (${airportCode}): ${key} ignored (out of range)`);
    return value;
  };
  const metrics = {
    delayPercentage: figure("delayPercentage", num(v.delayPercentage, 0, 100)),
    cancellationPercentage: figure("cancellationPercentage", num(v.cancellationPercentage, 0, 100)),
    averageDelayMinutes: figure("averageDelayMinutes", num(v.averageDelayMinutes, 0, 1440)),
    cancelledFlights: figure("cancelledFlights", num(v.cancelledFlights, 0, 100_000, true)),
  };

  let status = STATUSES.includes(v.operationalStatus as OperationalStatus) ? (v.operationalStatus as OperationalStatus) : undefined;
  const evidence = v.suspensionEvidence === undefined ? undefined : source(v.suspensionEvidence);

  if (status === "suspended") {
    const verified =
      evidence &&
      AUTHORITATIVE_TYPES.includes(evidence.type) &&
      (isApprovedAuthorityHost(evidence.url) || (v.sample === true && opts.allowSamples));
    if (!verified) {
      issues.push(`${where} (${airportCode}): "suspended" without authoritative evidence; not shown`);
      return {
        kind: "unverified_suspension",
        airportCode,
        observedAt,
        expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt).toISOString(),
        sourceName: src.name,
      };
    }
  }
  if (!status) {
    const derived = statusFromMetrics(metrics);
    if (derived === "unavailable") return issues.push(`${where} (${airportCode}): no verifiable status`), null;
    status = derived;
  }

  if (v.confidence !== undefined && !CONFIDENCES.includes(v.confidence as Confidence)) {
    issues.push(`${where} (${airportCode}): confidence ignored (expected high, medium or low)`);
  }
  const confidence: Confidence = CONFIDENCES.includes(v.confidence as Confidence)
    ? (v.confidence as Confidence)
    : AUTHORITATIVE_TYPES.includes(src.type)
      ? "high"
      : "medium";

  const record: AirportStatusRecord = {
    airportCode,
    airportNameAr,
    cityAr,
    countryCode,
    region: countryCode === "SA" ? "saudi" : "global",
    operationalStatus: status,
    source: src,
    observedAt,
    fetchedAt,
    confidence,
  };
  for (const [k, value] of Object.entries(metrics)) if (value !== undefined) (record as unknown as Record<string, number>)[k] = value;
  if (expiresAt !== undefined) record.expiresAt = new Date(expiresAt).toISOString();
  if (status === "suspended" && evidence) record.suspensionEvidence = evidence;
  // Optional fields that fail validation are dropped, but never silently.
  const optional = <T>(key: string, value: T | undefined, rule: string): T | undefined => {
    if (v[key] !== undefined && value === undefined) issues.push(`${where} (${airportCode}): ${key} ignored (${rule})`);
    return value;
  };
  const message = optional("statusMessageAr", text(v.statusMessageAr, 160), "1–160 characters");
  if (message) record.statusMessageAr = message;
  const action = optional("passengerActionAr", text(v.passengerActionAr, 160), "1–160 characters");
  if (action) record.passengerActionAr = action;
  const airline = optional("airlineStatus", link(v.airlineStatus), "name and https url");
  if (airline) record.airlineStatus = airline;
  if (v.sample === true) record.sample = true;
  return { kind: "record", record };
}

export function normalizeFeed(input: unknown, opts: NormalizeOptions): NormalizedFeed {
  const issues: string[] = [];
  if (!isObject(input) || !Array.isArray(input.records)) {
    return { records: [], conflicts: [], lastFetchedAt: null, issues: ["feed: expected an object with a records array"] };
  }
  if (input.records.length > MAX_RECORDS) issues.push(`feed: only the first ${MAX_RECORDS} records are read`);

  const byAirport = new Map<string, AirportStatusRecord[]>();
  const unverified = new Map<string, { observedAt: string; expiresAt?: string; sourceName: string }[]>();
  input.records.slice(0, MAX_RECORDS).forEach((raw, i) => {
    const p = parseRecord(raw, `records[${i}]`, opts, issues);
    if (!p) return;
    if (p.kind === "unverified_suspension") {
      // An expired claim no longer weighs on the airport.
      if (!isStale(p, opts.now)) unverified.set(p.airportCode, [...(unverified.get(p.airportCode) ?? []), p]);
      return;
    }
    byAirport.set(p.record.airportCode, [...(byAirport.get(p.record.airportCode) ?? []), p.record]);
  });

  const records: AirportStatusRecord[] = [];
  const conflicts: StatusConflict[] = [];
  const codes = new Set([...byAirport.keys(), ...unverified.keys()]);
  const newestFirst = <T extends { observedAt: string }>(list: T[]) =>
    list.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));

  for (const code of codes) {
    // A source's newer record supersedes its older ones (e.g. a reopening
    // notice after a suspension notice); only different sources can conflict.
    const latestPerSource = new Map<string, AirportStatusRecord>();
    for (const r of newestFirst(byAirport.get(code) ?? [])) if (!latestPerSource.has(r.source.name)) latestPerSource.set(r.source.name, r);
    const candidates = newestFirst([...latestPerSource.values()]);
    const claims = newestFirst(unverified.get(code) ?? []);
    const newest = candidates[0];
    const newestClaim = claims[0];

    let chosen: AirportStatusRecord | undefined;
    let conflict: StatusConflict | undefined;
    if (newest) {
      // Claims from different sources close to the newest one. Stale and
      // low-confidence records only decide when nothing better is in the window.
      const window = candidates.filter((r) => Date.parse(newest.observedAt) - Date.parse(r.observedAt) <= CONFLICT_WINDOW_MS);
      const usable = window.filter((r) => !isStale(r, opts.now) && r.confidence !== "low");
      const pool = usable.length > 0 ? usable : window;
      // The more cautious (more severe) verified description is shown.
      chosen = pool.reduce((acc, r) => (SEVERITY[r.operationalStatus] > SEVERITY[acc.operationalStatus] ? r : acc));
      if (new Set(pool.map((r) => r.operationalStatus)).size > 1) {
        conflict = {
          airportCode: code,
          noteAr: "المصادر غير متطابقة؛ نعرض الوصف الأكثر حذرًا. تحقق من المصدر الرسمي.",
          claims: pool.map((r) => ({ status: r.operationalStatus, sourceName: r.source.name, verified: true })),
        };
      }
    }

    // An unverified suspension claim at least as recent as the shown record:
    // a verified major disruption or suspension stays (it is already the
    // cautious reading) with the claim noted; a calmer verified status must
    // not stand in for a newer halt claim, so the airport becomes unavailable.
    if (newestClaim && (!chosen || Date.parse(newestClaim.observedAt) >= Date.parse(chosen.observedAt))) {
      conflicts.push({
        airportCode: code,
        noteAr: "ورد بلاغ بتوقف العمليات لم يُؤكَّد من مصدر رسمي؛ تحقق من المصدر الرسمي.",
        claims: [
          { status: "suspended", sourceName: newestClaim.sourceName, verified: false },
          ...(chosen ? [{ status: chosen.operationalStatus, sourceName: chosen.source.name, verified: true }] : []),
        ],
      });
      if (chosen && isMaterial(chosen.operationalStatus)) records.push(chosen);
      continue;
    }
    if (chosen) records.push(chosen);
    if (conflict) conflicts.push(conflict);
  }

  const lastFetchedAt = records.reduce<string | null>(
    (acc, r) => (acc === null || Date.parse(r.fetchedAt) > Date.parse(acc) ? r.fetchedAt : acc),
    null
  );
  return { records, conflicts, lastFetchedAt, issues };
}
