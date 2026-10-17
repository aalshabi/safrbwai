/**
 * Turns a snapshot into what the component shows. Pure, so every state can be
 * tested without rendering.
 */

import { GLOBAL_LIMIT, LIVE_MAX_AGE_MS, SAUDI_AIRPORTS } from "./config";
import {
  CONFIDENCE_LABEL_AR,
  SEVERITY,
  SOURCE_TYPE_LABEL_AR,
  STATUS_LABEL_AR,
  formatRiyadh,
  isStale,
  passengerActionFor,
} from "./status";
import type { AirportStatusRecord, AirportStatusSnapshot, DisplayedStatus, FeedMode, LinkRef, SourceRef } from "./types";

/** A figure: Arabic label, then the number isolated left-to-right so "%" stays put. */
export interface MetricLine {
  label: string;
  value: string;
  suffix?: string;
}

export interface AirportRow {
  airportCode: string;
  cityAr: string;
  airportNameAr: string;
  status: DisplayedStatus;
  isStale: boolean;
  /** Present when the record exists but is too old to be the current state. */
  lastKnown?: { label: string; at: string };
  lowConfidence: boolean;
  metrics: MetricLine[];
  statusMessage?: string;
  observedAt?: string;
  source?: SourceRef;
  sourceTypeLabel?: string;
  confidenceLabel?: string;
  suspensionEvidence?: SourceRef;
  airlineStatus?: LinkRef;
  officialLink?: LinkRef;
  action?: string;
  conflictNote?: string;
}

export interface AirportStatusView {
  mode: FeedMode;
  live: boolean;
  isSample: boolean;
  /** Worst status among current, non-low-confidence Saudi records (any Saudi airport). */
  saudiOverall: DisplayedStatus;
  /** "جدة (JED)" when the overall status is a disruption. */
  saudiMostAffected?: string;
  saudiCoverage: { verified: number; total: number };
  /** Some current record is displayed anywhere. */
  hasCurrentData: boolean;
  /** No current record for any airport outside the configured Saudi list. */
  globalUnavailable: boolean;
  refreshFailed: boolean;
  lastUpdate?: string;
  saudi: AirportRow[];
  global: AirportRow[];
}

const round = (n: number) => Math.round(n * 10) / 10;

function metricLines(r: AirportStatusRecord): MetricLine[] {
  const lines: MetricLine[] = [];
  if (r.delayPercentage !== undefined) lines.push({ label: "الرحلات المتأخرة", value: `${round(r.delayPercentage)}%` });
  if (r.averageDelayMinutes !== undefined) lines.push({ label: "متوسط التأخير", value: `${Math.round(r.averageDelayMinutes)}`, suffix: "دقيقة" });
  if (r.cancellationPercentage !== undefined) lines.push({ label: "نسبة الإلغاء", value: `${round(r.cancellationPercentage)}%` });
  if (r.cancelledFlights !== undefined) lines.push({ label: "الرحلات الملغاة", value: `${r.cancelledFlights}` });
  return lines;
}

function sourceDetails(r: AirportStatusRecord) {
  return {
    source: r.source,
    sourceTypeLabel: SOURCE_TYPE_LABEL_AR[r.source.type],
    confidenceLabel: CONFIDENCE_LABEL_AR[r.confidence],
  };
}

function currentRow(r: AirportStatusRecord, officialLink?: LinkRef, conflictNote?: string): AirportRow {
  return {
    airportCode: r.airportCode,
    cityAr: r.cityAr,
    airportNameAr: r.airportNameAr,
    status: r.operationalStatus,
    isStale: false,
    lowConfidence: r.confidence === "low",
    metrics: metricLines(r),
    statusMessage: r.statusMessageAr,
    observedAt: formatRiyadh(r.observedAt),
    ...sourceDetails(r),
    suspensionEvidence: r.suspensionEvidence,
    airlineStatus: r.airlineStatus,
    officialLink,
    action: passengerActionFor(r),
    conflictNote,
  };
}

function staleRow(r: AirportStatusRecord, officialLink?: LinkRef, conflictNote?: string): AirportRow {
  return {
    airportCode: r.airportCode,
    cityAr: r.cityAr,
    airportNameAr: r.airportNameAr,
    status: "unavailable",
    isStale: true,
    lastKnown: { label: STATUS_LABEL_AR[r.operationalStatus], at: formatRiyadh(r.observedAt) },
    lowConfidence: r.confidence === "low",
    metrics: [],
    ...sourceDetails(r),
    officialLink,
    conflictNote,
  };
}

const usable = (r: AirportStatusRecord, now: Date) => !isStale(r, now) && r.confidence !== "low";

export function buildAirportView(snapshot: AirportStatusSnapshot, now: Date): AirportStatusView {
  const byCode = new Map(snapshot.records.map((r) => [r.airportCode, r]));
  const conflictNote = new Map(snapshot.conflicts.map((c) => [c.airportCode, c.noteAr]));
  const configured = new Set(SAUDI_AIRPORTS.map((a) => a.airportCode));

  const saudi = SAUDI_AIRPORTS.map((a): AirportRow => {
    const r = byCode.get(a.airportCode);
    const note = conflictNote.get(a.airportCode);
    if (!r) {
      return {
        airportCode: a.airportCode,
        cityAr: a.cityAr,
        airportNameAr: a.airportNameAr,
        status: "unavailable",
        isStale: false,
        lowConfidence: false,
        metrics: [],
        officialLink: a.officialLink,
        conflictNote: note,
      };
    }
    return isStale(r, now) ? staleRow(r, a.officialLink, note) : currentRow(r, a.officialLink, note);
  });

  // Every non-configured airport competes for the list, whatever its region,
  // so a disrupted Saudi airport outside the list is never lost. Stale and
  // low-confidence records never rank.
  const others = snapshot.records.filter((r) => !configured.has(r.airportCode) && usable(r, now));
  const global = others
    .filter((r) => r.operationalStatus !== "normal")
    .sort(
      (a, b) =>
        SEVERITY[b.operationalStatus] - SEVERITY[a.operationalStatus] ||
        Date.parse(b.observedAt) - Date.parse(a.observedAt)
    )
    .slice(0, GLOBAL_LIMIT)
    .map((r) => currentRow(r, undefined, conflictNote.get(r.airportCode)));

  const verifiedSaudi = SAUDI_AIRPORTS.map((a) => byCode.get(a.airportCode)).filter(
    (r): r is AirportStatusRecord => !!r && usable(r, now)
  );
  // The summary covers every verified Saudi airport, configured or not
  // (e.g. a suspension at AHB); coverage counts the configured list.
  const allSaudi = snapshot.records.filter((r) => r.region === "saudi" && usable(r, now));
  const worst = allSaudi.reduce<AirportStatusRecord | undefined>(
    (acc, r) => (!acc || SEVERITY[r.operationalStatus] > SEVERITY[acc.operationalStatus] ? r : acc),
    undefined
  );

  return {
    mode: snapshot.mode,
    // A provider declared live is only "مباشر" while its data is recent: the
    // fetch cache can keep serving an old response while upstream is down.
    live:
      snapshot.live &&
      snapshot.lastSuccessfulUpdate !== null &&
      now.getTime() - Date.parse(snapshot.lastSuccessfulUpdate) <= LIVE_MAX_AGE_MS,
    isSample: snapshot.mode === "fixture" || snapshot.records.some((r) => r.sample),
    saudiOverall: worst?.operationalStatus ?? "unavailable",
    saudiMostAffected: worst && worst.operationalStatus !== "normal" ? `${worst.cityAr} (${worst.airportCode})` : undefined,
    saudiCoverage: { verified: verifiedSaudi.length, total: SAUDI_AIRPORTS.length },
    hasCurrentData: saudi.some((r) => r.status !== "unavailable") || global.length > 0,
    globalUnavailable: others.length === 0,
    refreshFailed: snapshot.refreshFailed,
    lastUpdate: snapshot.lastSuccessfulUpdate ? formatRiyadh(snapshot.lastSuccessfulUpdate) : undefined,
    saudi,
    global,
  };
}
