/**
 * Build the suggested clarifying questions before booking.
 *
 * Principles:
 *  - Booking-impact ordering: high → medium → low. The candidate list below is
 *    authored in priority order (final price/fees → transfers → room → meals →
 *    baggage → cancellation → excluded services → flight schedule → arrival fees).
 *  - Contextual, not generic: a question is emitted only when it is genuinely
 *    relevant to THIS offer (derived from facts + the original text), never for a
 *    field that is already present and consistent (no duplicate for confirmed info).
 *  - Conflicting fields always produce a specific resolution question (high).
 *  - Visa and insurance are NEVER shown by default — only when the offer text
 *    explicitly raises them.
 *  - Hard cap of 5 questions; no numeric score anywhere.
 */

import type { ChecklistItem, MissingField, QuestionPriority, SuggestedQuestion } from "./types";
import type { Bi } from "@/lib/offer-pipeline/types";
import { FIELDS } from "./required-fields";
import type { QuestionContext } from "./question-context";

const MAX_QUESTIONS = 5;
const PRIORITY_WEIGHT: Record<QuestionPriority, number> = { high: 0, medium: 1, low: 2 };

interface Candidate {
  key: string;
  priority: QuestionPriority;
  question: Bi;
  /** Whether this question applies to the current offer. */
  when: boolean;
}

export function buildSuggestedQuestions(
  missingFields: MissingField[],
  checklist: ChecklistItem[],
  context: QuestionContext
): SuggestedQuestion[] {
  const missing = new Set(missingFields.map((m) => m.key));
  const conflicting = new Set(checklist.filter((c) => c.status === "conflicting").map((c) => c.key));
  const registryQuestion = (key: string): Bi =>
    FIELDS.find((f) => f.key === key)?.question ?? { ar: "", en: "" };

  const candidates: Candidate[] = [];

  // (A) Conflicts first — a contradiction is the most urgent thing to resolve.
  // visa/insurance stay context-gated even here, so they can never surface
  // without the offer text raising them.
  const contextGate: Record<string, boolean> = {
    visa: context.visaMentioned,
    insurance: context.insuranceMentioned,
  };
  for (const field of FIELDS) {
    if (conflicting.has(field.key) && contextGate[field.key] !== false) {
      candidates.push({ key: field.key, priority: "high", question: registryQuestion(field.key), when: true });
    }
  }

  // (B) Missing CORE identity of the offer — without these nothing else matters.
  candidates.push({ key: "totalPrice", priority: "high", when: missing.has("totalPrice"), question: registryQuestion("totalPrice") });
  candidates.push({ key: "currency", priority: "high", when: missing.has("currency"), question: registryQuestion("currency") });
  candidates.push({ key: "nights", priority: "high", when: missing.has("nights"), question: registryQuestion("nights") });

  // (C) HIGH — the five clarifications with the largest booking impact, in order.

  // 1) Taxes and fees on top of the quoted price.
  candidates.push({
    key: "taxes",
    priority: "high",
    when: missing.has("taxes"),
    question: { ar: "هل السعر النهائي يشمل جميع الضرائب والرسوم؟", en: "Does the final price include all taxes and fees?" },
  });

  // 2) Airport transfers — nothing about ground transport was stated.
  candidates.push({
    key: "transfers",
    priority: "high",
    when: !context.transferConfirmed && !context.transportMentionedInText,
    question: { ar: "هل الاستقبال والتوصيل من وإلى المطار مشمولان في السعر؟", en: "Are airport pickup and drop-off included in the price?" },
  });

  // 3) Room type / beds.
  candidates.push({
    key: "roomType",
    priority: "high",
    when: context.hasAccommodation && !context.roomTypeMentioned,
    question: { ar: "ما نوع الغرفة وعدد الأسرّة المشمولة؟", en: "What is the room type and how many beds are included?" },
  });

  // 4) Cancellation / change policy.
  candidates.push({ key: "cancellationPolicy", priority: "high", when: missing.has("cancellationPolicy"), question: registryQuestion("cancellationPolicy") });

  // Transit risks stay unknown unless the offer states them explicitly.
  candidates.push({
    key: "airportChange",
    priority: "high",
    when: context.transitMentioned && !context.airportChangeKnown,
    question: { ar: "هل يتطلب الترانزيت تغيير المطار؟", en: "Does the transit require an airport change?" },
  });

  // 5) Baggage allowance.
  candidates.push({ key: "baggage", priority: "high", when: missing.has("baggage"), question: registryQuestion("baggage") });

  // (D) MEDIUM — useful, but only after the five above.

  // Private vs shared transport — transport exists (confirmed as a fact OR
  // mentioned in the text) but its TYPE was never stated. Knowing transport is
  // included does not tell the traveller whether they share a shuttle.
  candidates.push({
    key: "transferType",
    priority: "medium",
    when: (context.transferConfirmed || context.transportMentionedInText) && !context.transportTypeKnown,
    question: { ar: "هل المواصلات خاصة أم مشتركة؟", en: "Is the transport private or shared?" },
  });

  // Inter-city transfers when the offer spans multiple cities/hotels.
  candidates.push({
    key: "interCityTransfers",
    priority: "medium",
    when: context.multiCityOrHotel,
    question: { ar: "هل التنقلات بين المدن والفنادق مشمولة في السعر؟", en: "Are transfers between cities and hotels included in the price?" },
  });

  // Services explicitly NOT included.
  candidates.push({
    key: "excludedServices",
    priority: "medium",
    when: (context.hasFlight || context.hasAccommodation) && !context.excludedServicesMentioned,
    question: { ar: "ما الخدمات غير المشمولة في هذا العرض؟", en: "Which services are NOT included in this offer?" },
  });

  // Flight schedule / stops.
  candidates.push({
    key: "flightTimes",
    priority: "medium",
    when: context.hasFlight && !context.flightTimesKnown,
    question: { ar: "ما مواعيد الرحلات وعدد التوقفات؟", en: "What are the flight times and number of stops?" },
  });
  candidates.push({
    key: "transitDuration",
    priority: "medium",
    when: context.transitMentioned && !context.transitDurationKnown,
    question: { ar: "ما مدة الترانزيت؟", en: "How long is the transit?" },
  });
  candidates.push({
    key: "stopCount",
    priority: "medium",
    when: context.hasFlight && !context.stopCountKnown,
    question: { ar: "كم عدد التوقفات في مسار الرحلة؟", en: "How many stops are in the flight itinerary?" },
  });

  // Remaining core gaps.
  candidates.push({ key: "board", priority: "medium", when: missing.has("board"), question: registryQuestion("board") });
  candidates.push({ key: "travellers", priority: "medium", when: missing.has("travellers"), question: registryQuestion("travellers") });
  candidates.push({ key: "accommodation", priority: "medium", when: missing.has("accommodation"), question: registryQuestion("accommodation") });
  candidates.push({ key: "destination", priority: "medium", when: missing.has("destination"), question: registryQuestion("destination") });
  candidates.push({
    key: "childOccupancy",
    priority: "medium",
    when: context.hasChildren && !context.childBedsMentioned,
    question: { ar: "هل السعر يشمل أسرّة الأطفال أو السرير الإضافي؟", en: "Does the price include children's beds or an extra bed?" },
  });

  // (E) LOW / context-only — visa and insurance NEVER appear unless the offer
  // text itself raises them, and they always rank below everything above.
  candidates.push({
    key: "visa",
    priority: "low",
    when: context.visaMentioned && (missing.has("visa") || conflicting.has("visa")),
    question: registryQuestion("visa"),
  });
  candidates.push({
    key: "insurance",
    priority: "low",
    when: context.insuranceMentioned && (missing.has("insurance") || conflicting.has("insurance")),
    question: registryQuestion("insurance"),
  });

  // Fees paid on arrival.
  candidates.push({
    key: "arrivalFees",
    priority: "low",
    when: (context.hasFlight || context.hasAccommodation) && !context.arrivalFeesMentioned,
    question: { ar: "هل توجد رسوم تُدفع عند الوصول؟", en: "Are there any fees payable on arrival?" },
  });

  // Keep applicable candidates, drop duplicate keys (first authored wins), then a
  // STABLE priority sort (high → medium → low) preserving booking-impact order
  // within a tier, and finally cap at MAX_QUESTIONS.
  const seen = new Set<string>();
  const applicable = candidates.filter((c) => {
    if (!c.when || seen.has(c.key)) return false;
    seen.add(c.key);
    return true;
  });

  applicable.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);

  return applicable.slice(0, MAX_QUESTIONS).map(({ key, question, priority }) => ({ key, question, priority }));
}
