/**
 * Facts Analysis orchestrator — assembles the deterministic OfferAnalysis from
 * the (normalized) ExtractedOfferFacts. Pure: no LLM, no randomness, no I/O.
 *
 * `options.observations` supply multiple values per field for contradiction
 * detection; when omitted, they are derived from the facts (≤ 1 each).
 * `options.text` is the ORIGINAL offer text, used ONLY to decide which clarifying
 * questions are contextually relevant — it never mutates facts or evidence.
 */

import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import type { OfferAnalysis, OfferObservations } from "./types";
import { buildConfirmedFacts } from "./confirmed-facts";
import { detectContradictions } from "./contradictions";
import { buildMissingFields } from "./missing-fields";
import { buildChecklist } from "./checklist";
import { buildSuggestedQuestions } from "./questions";
import { deriveQuestionContext } from "./question-context";
import { computeCompleteness } from "./completeness";

export interface AnalyzeOptions {
  /** The original offer text — used only to contextualize suggested questions. */
  text?: string;
  /** Multiple observations per field for contradiction detection. */
  observations?: OfferObservations;
}

export function analyzeFacts(facts: ExtractedOfferFacts, options?: AnalyzeOptions): OfferAnalysis {
  const contradictions = detectContradictions(facts, options?.observations);
  const missingFields = buildMissingFields(facts);
  const checklist = buildChecklist(facts, contradictions);
  const context = deriveQuestionContext(facts, options?.text);

  return {
    confirmedFacts: buildConfirmedFacts(facts, options?.observations),
    missingFields,
    contradictions,
    checklist,
    suggestedQuestions: buildSuggestedQuestions(missingFields, checklist, context),
    completeness: computeCompleteness(facts),
  };
}
