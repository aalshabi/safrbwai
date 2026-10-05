/**
 * Facts Analysis Engine — output contract.
 *
 * The analysis is deterministic and explainable: it is derived ONLY from the
 * (normalized) ExtractedOfferFacts and their original evidence. No LLM, no
 * random scoring, no invented information.
 */

import type { Bi, OfferPriceBasis } from "@/lib/offer-pipeline/types";

export type FieldRequirement = "required" | "recommended" | "context-dependent";

/** A fact that was actually extracted, with its traceable evidence. */
export interface ConfirmedFact {
  key: string;
  label: Bi;
  value: unknown;
  evidence: string;
  confidenceType: "exact";
}

/** An essential/useful field that is absent from the offer. */
export interface MissingField {
  key: string;
  label: Bi;
  requirement: FieldRequirement;
}

export type ContradictionCode =
  | "multiple_prices"
  | "price_total_mismatch"
  | "conflicting_currency"
  | "conflicting_nights"
  | "conflicting_board"
  | "conflicting_baggage"
  | "conflicting_insurance"
  | "conflicting_visa"
  | "conflicting_transfers";

export interface Contradiction {
  code: ContradictionCode;
  message: Bi;
  evidence: string[];
  /** "critical" ONLY when the conflict fundamentally blocks understanding. */
  severity: "warning" | "critical";
}

export type ChecklistStatus = "present" | "missing" | "conflicting";

export interface ChecklistItem {
  key: string;
  label: Bi;
  status: ChecklistStatus;
  evidence: string[];
  explanation: Bi;
}

/**
 * Booking-impact priority for a suggested question. Questions are ordered
 * high → medium → low so the most decision-critical clarifications surface first.
 */
export type QuestionPriority = "high" | "medium" | "low";

/**
 * A question generated ONLY from a missing, conflicting, or context-relevant
 * item. Never produced for a field that is present and consistent.
 */
export interface SuggestedQuestion {
  key: string;
  question: Bi;
  priority: QuestionPriority;
}

export interface CompletenessField {
  key: string;
  present: boolean;
}

export interface OfferCompleteness {
  present: number;
  required: number;
  fields: CompletenessField[];
}

export interface OfferAnalysis {
  confirmedFacts: ConfirmedFact[];
  missingFields: MissingField[];
  contradictions: Contradiction[];
  checklist: ChecklistItem[];
  suggestedQuestions: SuggestedQuestion[];
  completeness: OfferCompleteness;
}

/**
 * Optional multi-observation input for contradiction detection. A single
 * ExtractedOfferFacts holds at most one value per field, so genuine "two
 * different X" conflicts are supplied here (the extractor will populate these
 * in a later task). When omitted, observations are derived from the facts
 * (≤ 1 each), so no false contradictions are produced.
 */
export interface OfferObservations {
  prices?: { amount: number; currency: string; basis: OfferPriceBasis; evidence: string }[];
  currencies?: { code: string; evidence: string }[];
  nights?: { value: number; evidence: string }[];
  boards?: { value: string; evidence: string }[];
  baggage?: { value: string; evidence: string }[];
  insurance?: { value: boolean; evidence: string }[];
  visa?: { value: boolean; evidence: string }[];
  transfers?: { value: boolean; evidence: string }[];
}
