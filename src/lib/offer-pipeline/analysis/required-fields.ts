/**
 * The canonical field registry — the single source of truth for which fields
 * the analysis considers, how each is classified (required / recommended /
 * context-dependent), how its presence is detected from the facts, whether it
 * appears on the checklist, and the question to ask when it is missing.
 *
 * Requirement policy (an offer is not "everything mandatory"):
 *  - required:            the fields a flight+hotel package must state to be
 *                         judged at all — totalPrice, currency, destination,
 *                         nights, travellers, accommodation, board, transfers,
 *                         taxes, cancellationPolicy. These are the fields the
 *                         completeness ratio counts.
 *  - recommended:         baggage, travelDates
 *  - context-dependent:   visa, insurance — DELIBERATELY never counted in
 *                         completeness, because they only matter when the offer
 *                         itself raises them.
 */

import type { ExtractedOfferFacts, Fact } from "@/lib/offer-pipeline/types";
import type { Bi } from "@/lib/offer-pipeline/types";
import type { ContradictionCode, FieldRequirement } from "./types";

export interface FieldDef {
  key: string;
  label: Bi;
  requirement: FieldRequirement;
  inChecklist: boolean;
  question: Bi;
  /** Contradiction code that marks this field "conflicting", if applicable. */
  conflictCodes?: ContradictionCode[];
  /** Backing fact accessor (presence + evidence), when the field is fact-backed. */
  fact?: (f: ExtractedOfferFacts) => Fact<unknown> | undefined;
  /** Presence override (e.g. currency is present via a standalone fact OR a price). */
  isPresent?: (f: ExtractedOfferFacts) => boolean;
  /** Evidence override. */
  evidence?: (f: ExtractedOfferFacts) => string[];
}

export const FIELDS: FieldDef[] = [
  {
    key: "totalPrice",
    label: { ar: "السعر النهائي", en: "Total price" },
    requirement: "required",
    inChecklist: true,
    conflictCodes: ["multiple_prices", "price_total_mismatch"],
    fact: (f) => f.totalPrice,
    question: {
      ar: "ما إجمالي الرحلة الصحيح، وهل يطابق سعر الشخص وعدد المسافرين؟",
      en: "What is the correct trip total, and does it match the per-person price and traveller count?",
    },
  },
  {
    key: "currency",
    label: { ar: "العملة", en: "Currency" },
    requirement: "required",
    inChecklist: true,
    conflictCodes: ["conflicting_currency"],
    isPresent: (f) =>
      Boolean(f.currency) ||
      Boolean(f.totalPrice) ||
      Boolean(f.perPersonPrice) ||
      Boolean(f.perNightPrice) ||
      Boolean(f.statedPrice),
    evidence: (f) => {
      const price = f.totalPrice ?? f.perPersonPrice ?? f.perNightPrice ?? f.statedPrice;
      return f.currency ? [f.currency.evidence] : price ? [price.evidence] : [];
    },
    question: { ar: "ما العملة المعتمدة للسعر؟", en: "Which currency does the price use?" },
  },
  {
    key: "nights",
    label: { ar: "عدد الليالي", en: "Number of nights" },
    requirement: "required",
    inChecklist: true,
    conflictCodes: ["conflicting_nights"],
    fact: (f) => f.nights,
    question: { ar: "كم عدد الليالي بالضبط؟", en: "Exactly how many nights?" },
  },
  {
    key: "destination",
    label: { ar: "الوجهة", en: "Destination" },
    requirement: "required",
    inChecklist: true,
    fact: (f) => f.destination,
    question: { ar: "ما وجهة الرحلة؟", en: "What is the destination?" },
  },
  {
    key: "travellers",
    label: { ar: "عدد المسافرين", en: "Travellers" },
    requirement: "required",
    inChecklist: true,
    fact: (f) => f.travelers,
    question: { ar: "كم عدد المسافرين (بالغون وأطفال)؟", en: "How many travellers (adults and children)?" },
  },
  {
    key: "accommodation",
    label: { ar: "الإقامة", en: "Accommodation" },
    requirement: "required",
    inChecklist: true,
    fact: (f) => f.accommodation,
    question: { ar: "ما اسم/فئة مكان الإقامة؟", en: "What is the accommodation name/category?" },
  },
  {
    key: "board",
    label: { ar: "نوع الوجبة", en: "Board" },
    requirement: "required",
    inChecklist: true,
    conflictCodes: ["conflicting_board"],
    fact: (f) => f.board,
    question: { ar: "ما نوع الإقامة (إفطار/نصف/كامل)؟", en: "What board type (BB/HB/FB)?" },
  },
  {
    key: "baggage",
    label: { ar: "الأمتعة", en: "Baggage" },
    requirement: "recommended",
    inChecklist: true,
    conflictCodes: ["conflicting_baggage"],
    fact: (f) => f.baggage,
    question: { ar: "كم وزن الأمتعة المسموح؟", en: "What is the baggage allowance?" },
  },
  {
    key: "transfers",
    label: { ar: "التحويلات", en: "Transfers" },
    requirement: "required",
    inChecklist: true,
    conflictCodes: ["conflicting_transfers"],
    fact: (f) => f.transfer,
    question: { ar: "هل النقل من وإلى المطار مشمول؟", en: "Are airport transfers included?" },
  },
  {
    key: "taxes",
    label: { ar: "الضرائب والرسوم", en: "Taxes & fees" },
    requirement: "required",
    inChecklist: true,
    fact: (f) => f.taxes,
    question: { ar: "هل السعر يشمل الضرائب والرسوم؟", en: "Does the price include taxes and fees?" },
  },
  {
    key: "cancellationPolicy",
    label: { ar: "سياسة الإلغاء", en: "Cancellation policy" },
    requirement: "required",
    inChecklist: true,
    fact: (f) => f.cancellationPolicy,
    question: { ar: "ما سياسة الإلغاء والتعديل؟", en: "What is the cancellation/change policy?" },
  },
  {
    key: "travelDates",
    label: { ar: "تواريخ السفر", en: "Travel dates" },
    requirement: "recommended",
    inChecklist: false,
    question: { ar: "ما تواريخ السفر؟", en: "What are the travel dates?" },
  },
  {
    key: "visa",
    label: { ar: "التأشيرة", en: "Visa" },
    requirement: "context-dependent",
    inChecklist: true,
    conflictCodes: ["conflicting_visa"],
    fact: (f) => f.visa,
    question: { ar: "هل التأشيرة مشمولة؟", en: "Is the visa included?" },
  },
  {
    key: "insurance",
    label: { ar: "التأمين", en: "Insurance" },
    requirement: "context-dependent",
    inChecklist: true,
    conflictCodes: ["conflicting_insurance"],
    fact: (f) => f.insurance,
    question: { ar: "هل التأمين مشمول؟", en: "Is travel insurance included?" },
  },
];

/** Fields counted in the completeness ratio (present / required). */
export const REQUIRED_FIELDS = FIELDS.filter((field) => field.requirement === "required");

/** Whether a field is present in the given facts. */
export function isFieldPresent(field: FieldDef, facts: ExtractedOfferFacts): boolean {
  if (field.isPresent) return field.isPresent(facts);
  if (field.fact) return field.fact(facts) !== undefined;
  return false;
}

/** Evidence spans backing a field's presence (empty when absent). */
export function fieldEvidence(field: FieldDef, facts: ExtractedOfferFacts): string[] {
  if (field.evidence) return field.evidence(facts);
  const fact = field.fact?.(facts);
  return fact?.evidence ? [fact.evidence] : [];
}
