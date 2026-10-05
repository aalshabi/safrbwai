/**
 * Build the transparent checklist. Each checklist field is present, missing, or
 * conflicting (when a contradiction maps to it), with the evidence and a short
 * bilingual explanation.
 */

import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import type { ChecklistItem, Contradiction } from "./types";
import { FIELDS, fieldEvidence, isFieldPresent, type FieldDef } from "./required-fields";

function explanationFor(field: FieldDef, status: ChecklistItem["status"]): { ar: string; en: string } {
  if (status === "conflicting") {
    return { ar: `«${field.label.ar}» مذكورة بشكل متعارض.`, en: `"${field.label.en}" is stated inconsistently.` };
  }
  if (status === "present") {
    return { ar: `«${field.label.ar}» واضحة ومؤكدة.`, en: `"${field.label.en}" is clear and confirmed.` };
  }
  return { ar: `«${field.label.ar}» غير مذكورة.`, en: `"${field.label.en}" is not stated.` };
}

export function buildChecklist(facts: ExtractedOfferFacts, contradictions: Contradiction[]): ChecklistItem[] {
  return FIELDS.filter((field) => field.inChecklist).map((field) => {
    const matchingConflicts = contradictions.filter((contradiction) =>
      field.conflictCodes?.includes(contradiction.code)
    );
    const conflicting = matchingConflicts.length > 0;
    const present = isFieldPresent(field, facts);
    const status: ChecklistItem["status"] = conflicting ? "conflicting" : present ? "present" : "missing";

    const evidence = conflicting
      ? [...new Set(matchingConflicts.flatMap((conflict) => conflict.evidence))]
      : fieldEvidence(field, facts);

    return { key: field.key, label: field.label, status, evidence, explanation: explanationFor(field, status) };
  });
}
