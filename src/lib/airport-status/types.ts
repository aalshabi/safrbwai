/**
 * Provider-independent airport-status model. Every provider (manual feed, CMS,
 * authorized API) is normalized into these records, so a new provider never
 * touches the presentation components.
 *
 * "unavailable" is never stored: an airport with no current verified record
 * is shown as unavailable by the view layer.
 */

export type OperationalStatus = "normal" | "minor_delays" | "major_disruption" | "suspended";
export type DisplayedStatus = OperationalStatus | "unavailable";

export type AirportRegion = "saudi" | "global";

/**
 * Who published the information. Only the authoritative types can support a
 * suspension; flight trackers and disruption scores never can.
 */
export type SourceType =
  | "official_airport"
  | "civil_aviation_authority"
  | "airline_notice"
  | "approved_authority"
  | "flight_tracker"
  | "manual_review";

export type Confidence = "high" | "medium" | "low";

export interface SourceRef {
  name: string;
  /** https only. */
  url: string;
  type: SourceType;
}

/** A link without an authority claim (e.g. an airline's flight-status page). */
export interface LinkRef {
  name: string;
  url: string;
}

export interface AirportStatusRecord {
  airportCode: string;
  airportNameAr: string;
  cityAr: string;
  /** ISO 3166-1 alpha-2. "SA" makes the record Saudi. */
  countryCode: string;
  region: AirportRegion;
  operationalStatus: OperationalStatus;
  delayPercentage?: number;
  cancellationPercentage?: number;
  averageDelayMinutes?: number;
  cancelledFlights?: number;
  statusMessageAr?: string;
  passengerActionAr?: string;
  source: SourceRef;
  /** Required for "suspended": an authoritative notice of the suspension. */
  suspensionEvidence?: SourceRef;
  airlineStatus?: LinkRef;
  /** When the source observed or published the status. */
  observedAt: string;
  /** When we (or the editor) retrieved it from the source. */
  fetchedAt: string;
  /** After this the record is stale. Defaults to observedAt + STALE_AFTER_MS. */
  expiresAt?: string;
  confidence: Confidence;
  /** Development/test fixtures only. Rejected in production. */
  sample?: true;
}

/** Sources disagreed about an airport; kept for the details layer and logs. */
export interface StatusConflict {
  airportCode: string;
  noteAr: string;
  claims: { status: OperationalStatus; sourceName: string; verified: boolean }[];
}

export type FeedMode = "authorized_api" | "cms_feed" | "manual_feed" | "fixture" | "unavailable";

export interface AirportStatusSnapshot {
  mode: FeedMode;
  /** True only when an authorized provider declares its data live. */
  live: boolean;
  records: AirportStatusRecord[];
  conflicts: StatusConflict[];
  /** Latest fetchedAt of the data being shown (ISO), if any. */
  lastSuccessfulUpdate: string | null;
  /** The latest refresh failed; records (if any) are the last good copy. */
  refreshFailed: boolean;
  /** Validation and provider problems, for logs only. Never rendered. */
  issues: string[];
}
