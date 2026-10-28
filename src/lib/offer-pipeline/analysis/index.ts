/**
 * Facts Analysis Engine — public surface.
 */

export { analyzeFacts } from "./analyze-facts";
export type { AnalyzeOptions } from "./analyze-facts";
export { deriveQuestionContext } from "./question-context";
export type { QuestionContext } from "./question-context";
export { detectContradictions } from "./contradictions";
export { buildConfirmedFacts } from "./confirmed-facts";
export { buildMissingFields } from "./missing-fields";
export { buildChecklist } from "./checklist";
export { buildSuggestedQuestions } from "./questions";
export { computeCompleteness } from "./completeness";
export { buildInferredConcerns } from "./concerns";
export { FIELDS, REQUIRED_FIELDS, isFieldPresent } from "./required-fields";
export type {
  OfferAnalysis,
  OfferObservations,
  ConfirmedFact,
  InferredConcern,
  MissingField,
  Contradiction,
  ContradictionCode,
  ChecklistItem,
  ChecklistStatus,
  SuggestedQuestion,
  QuestionPriority,
  OfferCompleteness,
  CompletenessField,
  FieldRequirement,
} from "./types";
