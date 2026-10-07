/**
 * Travel Offer Pipeline — canonical data model (Task 1: models only).
 *
 * This module defines the *contract* for the whole pipeline
 * (ingest → extract → normalize → analyze → present). It contains TYPES and
 * CONSTANTS only — no extraction, normalization, analysis, network, disk, OCR,
 * or PDF parsing lives here or is wired yet.
 *
 * Design guarantees encoded in these types:
 *  - Extraction is kept strictly SEPARATE from analysis: when extraction fails,
 *    no analysis object is ever produced (see `ExtractionResult`; the analysis
 *    model lives canonically in ./analysis/types.ts).
 *  - Every extracted fact is traceable to its `evidence` and carries a
 *    categorical `confidenceType` — never a numeric confidence score.
 *  - Absent facts are omitted, never invented.
 */

/** Bilingual string (Arabic source-of-truth + English) used in pipeline output. */
export interface Bi {
  ar: string;
  en: string;
}

/** Response schema version. Bump only on a breaking change to the output shape. */
export const SCHEMA_VERSION = "1.0" as const;

/** Machine-readable error codes returned by the pipeline / API. */
export const OFFER_ERROR_CODES = {
  invalidInput: "INVALID_INPUT",
  payloadTooLarge: "PAYLOAD_TOO_LARGE",
  extractionFailed: "EXTRACTION_FAILED",
  sourceNotSupported: "SOURCE_NOT_SUPPORTED",
} as const;

export type OfferApiErrorCode = (typeof OFFER_ERROR_CODES)[keyof typeof OFFER_ERROR_CODES];

/** Why an extraction produced no usable facts. */
export type ExtractionFailureReason = "unsupported" | "unreadable" | "empty";

// ---- pipeline input --------------------------------------------------------

/** File metadata entering the pipeline. Bytes are NOT read in this phase. */
export interface RawOfferFile {
  name: string;
  size: number;
  mimeType: string;
}

/**
 * The raw source entering the pipeline, discriminated by `type`. Text and URL
 * carry their strings; PDF and image carry metadata only (no bytes are parsed
 * in this phase).
 */
export type RawOfferSource =
  | { type: "text"; text: string }
  | { type: "url"; url: string }
  | { type: "pdf"; file: RawOfferFile }
  | { type: "image"; file: RawOfferFile };

// ---- extracted facts -------------------------------------------------------

/**
 * A single extracted fact, always traceable to the exact `evidence` span it
 * came from. `confidenceType` is CATEGORICAL, never a numeric score. In the
 * current phase only "exact" is produced; "inferred" exists in the type but no
 * code path emits it (inference is disabled).
 */
export interface Fact<T> {
  value: T;
  evidence: string;
  confidenceType: "exact" | "inferred";
}

export interface OfferPrice {
  amount: number;
  currency: string;
}

/** The exact basis attached to a stated monetary amount. */
export type OfferPriceBasis = "total" | "per_person" | "per_night" | "unspecified";

export interface OfferTravelers {
  adults?: number;
  children?: number;
}

/** A stated transit duration, normalized without losing the original evidence. */
export interface OfferDuration {
  minutes: number;
}

/**
 * How a destination was identified.
 *  - "canonical_alias":  matched a curated dictionary entry, so a standard name
 *                        and country code are known.
 *  - "explicit_mention": the offer stated a destination explicitly ("إلى …",
 *                        "destination: …") that is not in the dictionary. The
 *                        wording is reported as-is; NO standard name or country
 *                        is invented for it.
 */
export type DestinationMatchType = "canonical_alias" | "explicit_mention";

export interface OfferDestination {
  /** The destination exactly as the offer worded it. */
  value: string;
  /** Standard name — present ONLY for a dictionary match. */
  canonicalValue?: string;
  /** ISO 3166-1 alpha-2 — present ONLY for a dictionary match. */
  countryCode?: string;
  matchType: DestinationMatchType;
}

/**
 * The canonical fact model. Every field is optional: a field is present ONLY
 * when it was extracted with confidence. Absent fields are omitted — the
 * pipeline never fabricates them. Uncertain captures become `warnings`, not facts.
 */
export interface ExtractedOfferFacts {
  /**
   * Backward-compatible alias for the preferred stated price. New analysis
   * code must use the basis-specific facts below instead of assuming this is
   * a trip total.
   */
  price?: Fact<OfferPrice>;
  totalPrice?: Fact<OfferPrice>;
  perPersonPrice?: Fact<OfferPrice>;
  perNightPrice?: Fact<OfferPrice>;
  statedPrice?: Fact<OfferPrice>;
  /** Currency stated in the offer, even when no complete price is present. */
  currency?: Fact<string>;
  destination?: Fact<OfferDestination>;
  nights?: Fact<number>;
  travelers?: Fact<OfferTravelers>;
  board?: Fact<string>;
  flight?: Fact<{ included: boolean }>;
  baggage?: Fact<string>;
  transfer?: Fact<{ included: boolean }>;
  insurance?: Fact<boolean>;
  visa?: Fact<boolean>;
  /** Whether taxes/fees are stated as included in the price. */
  taxes?: Fact<{ included: boolean }>;
  /** The cancellation/refund terms exactly as stated (never paraphrased). */
  cancellationPolicy?: Fact<string>;
  /** Accommodation CATEGORY as stated (e.g. "فندق ٥ نجوم") — never a guessed name. */
  accommodation?: Fact<string>;
  /** Room type exactly as stated (e.g. "غرفة ديلوكس", "deluxe room"). */
  roomType?: Fact<string>;
  /** Transit duration only when the offer states a numeric duration. */
  transitDuration?: Fact<OfferDuration>;
  /** Number of flight stops only when explicitly stated or singularly named. */
  stopCount?: Fact<number>;
  /** Whether an airport change is required, only when explicitly stated. */
  airportChange?: Fact<boolean>;
}

// ---- extraction result (kept separate from analysis) -----------------------

/**
 * Result of the extraction stage ONLY. Deliberately distinct from the analysis
 * stage: on `ok: false` no analysis is created downstream.
 */
export type ExtractionResult =
  | { ok: true; facts: ExtractedOfferFacts; warnings: Bi[] }
  | { ok: false; reason: ExtractionFailureReason };

// ---- analysis & pipeline result -------------------------------------------
//
// The analysis model — `OfferAnalysis` and its parts (ConfirmedFact,
// MissingField, Contradiction, ChecklistItem, SuggestedQuestion,
// OfferCompleteness, …) — is defined CANONICALLY and ONLY in ./analysis/types.ts.
// Do not redefine it here. The top-level pipeline/API result type will be
// defined by the pipeline/route layer (not built yet) from that canonical model.
