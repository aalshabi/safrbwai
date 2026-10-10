import type { ContradictionCode } from "@/lib/offer-pipeline/analysis";

export const REGRESSION_LOCALES = ["ar", "en"] as const;
export type RegressionLocale = (typeof REGRESSION_LOCALES)[number];

export const REGRESSION_CATEGORIES = [
  "core_essentials",
  "relatively_complete",
  "missing_cancellation",
  "missing_taxes",
  "explicit_currency",
  "conflicting_prices",
  "price_basis_consistent",
  "price_basis_missing",
  "price_total_mismatch",
  "decision_integrity_details",
  "ground_transport_not_flight",
  "conflicting_nights",
  "canonical_destination",
  "explicit_destination",
  "board_and_accommodation",
  "baggage",
  "airport_transfers",
  "negated_inclusion",
  "no_unsupported_destination_or_flight",
  "travellers",
  "insurance_context",
  "insurance_absent",
  "visa_context",
  "visa_absent",
  "short_analyzable",
  "noisy_safe",
  "insufficient",
] as const;

export type RegressionCategory = (typeof REGRESSION_CATEGORIES)[number];

export const REGRESSION_FIELD_KEYS = [
  "totalPrice",
  "perPersonPrice",
  "perNightPrice",
  "statedPrice",
  "currency",
  "nights",
  "destination",
  "travellers",
  "accommodation",
  "roomType",
  "board",
  "baggage",
  "transfers",
  "taxes",
  "cancellationPolicy",
  "travelDates",
  "visa",
  "insurance",
  "flight",
  "transitDuration",
  "stopCount",
  "airportChange",
] as const;

export type RegressionFieldKey = (typeof REGRESSION_FIELD_KEYS)[number];

export interface RegressionExpectations {
  mustConfirm: readonly RegressionFieldKey[];
  mustNotConfirm: readonly RegressionFieldKey[];
  mustMarkMissing: readonly RegressionFieldKey[];
  mustNotMarkMissing: readonly RegressionFieldKey[];
  mustDetectContradictions: readonly ContradictionCode[];
  mustAsk: readonly string[];
  mustNotAsk: readonly string[];
  expectedValues?: Partial<Record<RegressionFieldKey, unknown>>;
  maxSuggestedQuestions: number;
}

export interface RegressionFixture {
  id: string;
  locale: RegressionLocale;
  category: RegressionCategory;
  description: string;
  syntheticInput: string;
  expectations: RegressionExpectations;
}

type FixtureMetadata = Omit<RegressionFixture, "expectations">;
type FixtureExpectations = Partial<Omit<RegressionExpectations, "maxSuggestedQuestions">> & {
  maxSuggestedQuestions?: number;
};

export function defineRegressionFixture(
  metadata: FixtureMetadata,
  expectations: FixtureExpectations
): RegressionFixture {
  return {
    ...metadata,
    expectations: {
      mustConfirm: [],
      mustNotConfirm: [],
      mustMarkMissing: [],
      mustNotMarkMissing: [],
      mustDetectContradictions: [],
      mustAsk: [],
      mustNotAsk: [],
      maxSuggestedQuestions: 5,
      ...expectations,
    },
  };
}
