/**
 * Status vocabulary and mapping rules.
 *
 * Mapping rules (normalize.ts applies them):
 * 1. An explicit normal / minor_delays / major_disruption from a valid source is kept.
 * 2. "suspended" is kept only with suspensionEvidence of an authoritative type
 *    (official_airport, civil_aviation_authority, airline_notice,
 *    approved_authority) on a government or explicitly approved host.
 *    Otherwise the record is dropped and the airport shows "unavailable".
 * 3. With no explicit status, figures map through statusFromMetrics, which can
 *    never return "suspended": delays, cancellations, missing flights, empty
 *    results, tracking gaps and disruption scores never mean a suspension.
 * 4. Conflicting current claims: the more cautious (more severe) verified
 *    status is shown and the conflict is recorded.
 */

import { STALE_AFTER_MS } from "./config";
import type { AirportStatusRecord, Confidence, DisplayedStatus, OperationalStatus, SourceType } from "./types";

export const STATUS_LABEL_AR: Record<DisplayedStatus, string> = {
  normal: "يعمل بشكل طبيعي",
  minor_delays: "تأخيرات محدودة",
  major_disruption: "اضطراب مرتفع",
  suspended: "عمليات متوقفة",
  unavailable: "البيانات غير متاحة",
};

export const SOURCE_TYPE_LABEL_AR: Record<SourceType, string> = {
  official_airport: "مصدر المطار الرسمي",
  civil_aviation_authority: "هيئة الطيران المدني",
  airline_notice: "إشعار شركة طيران",
  approved_authority: "جهة رسمية معتمدة",
  flight_tracker: "منصة تتبع رحلات",
  manual_review: "مراجعة يدوية لمصدر",
};

export const CONFIDENCE_LABEL_AR: Record<Confidence, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

export const AUTHORITATIVE_TYPES: readonly SourceType[] = [
  "official_airport",
  "civil_aviation_authority",
  "airline_notice",
  "approved_authority",
];

/** Higher is more severe. "unavailable" sorts below every verified status. */
export const SEVERITY: Record<DisplayedStatus, number> = {
  unavailable: -1,
  normal: 0,
  minor_delays: 1,
  major_disruption: 2,
  suspended: 3,
};

/** Status from figures alone. Never "suspended". */
export function statusFromMetrics(m: {
  delayPercentage?: number;
  cancellationPercentage?: number;
  averageDelayMinutes?: number;
}): Exclude<DisplayedStatus, "suspended"> {
  const { delayPercentage: d, cancellationPercentage: c, averageDelayMinutes: a } = m;
  if (d === undefined && c === undefined && a === undefined) return "unavailable";
  if ((c ?? 0) >= 10 || (d ?? 0) >= 40 || (a ?? 0) >= 60) return "major_disruption";
  if ((c ?? 0) >= 3 || (d ?? 0) >= 15 || (a ?? 0) >= 20) return "minor_delays";
  return "normal";
}

export function expiryOf(record: Pick<AirportStatusRecord, "observedAt" | "expiresAt">): number {
  return record.expiresAt ? Date.parse(record.expiresAt) : Date.parse(record.observedAt) + STALE_AFTER_MS;
}

export function isStale(record: Pick<AirportStatusRecord, "observedAt" | "expiresAt">, now: Date): boolean {
  return now.getTime() > expiryOf(record);
}

export function isMaterial(status: DisplayedStatus): boolean {
  return status === "major_disruption" || status === "suspended";
}

const DEFAULT_ACTION: Partial<Record<OperationalStatus, string>> = {
  major_disruption: "راجع حالة رحلتك مع شركة الطيران قبل التوجه إلى المطار، واترك وقتًا إضافيًا.",
  suspended: "لا تتوجه إلى المطار قبل أن تؤكد شركة الطيران حالة رحلتك.",
};

export function passengerActionFor(record: AirportStatusRecord): string | undefined {
  if (!isMaterial(record.operationalStatus)) return undefined;
  return record.passengerActionAr ?? DEFAULT_ACTION[record.operationalStatus];
}

const RIYADH = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  timeZone: "Asia/Riyadh",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
});

/** Gregorian date and time in Asia/Riyadh with Latin digits (site convention). */
export function formatRiyadh(iso: string): string {
  return RIYADH.format(new Date(iso));
}
