/**
 * Derive a lightweight, read-only QuestionContext from the extracted facts and
 * (optionally) the original offer text. This is used ONLY to decide which
 * clarifying questions are relevant — it NEVER mutates or produces facts, adds
 * evidence, or feeds the confirmed-facts/checklist/completeness output.
 *
 * Keyword scanning is deliberately conservative and language-aware (Arabic +
 * English). Arabic is matched on the raw text (case has no effect); English is
 * matched on a lowercased copy. No regex backtracking hazards: plain substring
 * checks only.
 */

import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";

export interface QuestionContext {
  /** A flight/air ticket is part of the offer (fact or explicit mention). */
  hasFlight: boolean;
  /** A stay/accommodation is part of the offer (fact or explicit mention). */
  hasAccommodation: boolean;
  /** Ground transport / transfers are confirmed as an extracted fact. */
  transferConfirmed: boolean;
  /** The text mentions transport/transfers (regardless of inclusion). */
  transportMentionedInText: boolean;
  /** The transport TYPE (private vs shared) is explicitly stated. */
  transportTypeKnown: boolean;
  /** The offer spans multiple cities and/or hotels. */
  multiCityOrHotel: boolean;
  /** A room type / bedding configuration is stated. */
  roomTypeMentioned: boolean;
  /** Children are part of the party (fact or explicit mention). */
  hasChildren: boolean;
  /** Child beds / extra bed / occupancy for children is addressed. */
  childBedsMentioned: boolean;
  /** Meals / board are stated (fact or explicit mention). */
  mealsMentioned: boolean;
  /** Flight schedule (times / stops / transit) is stated. */
  flightTimesKnown: boolean;
  /** Transit/layover is explicitly raised by the offer. */
  transitMentioned: boolean;
  /** A numeric transit duration was extracted. */
  transitDurationKnown: boolean;
  /** A stop count was extracted. */
  stopCountKnown: boolean;
  /** Airport-change status was explicitly stated. */
  airportChangeKnown: boolean;
  /** Fees payable on arrival are explicitly addressed. */
  arrivalFeesMentioned: boolean;
  /** Excluded / not-included services are explicitly addressed. */
  excludedServicesMentioned: boolean;
  /** Visa is explicitly mentioned in the text (gate for the visa question). */
  visaMentioned: boolean;
  /** Insurance is explicitly mentioned in the text (gate for the insurance question). */
  insuranceMentioned: boolean;
}

const KEYWORDS = {
  flight: ["طيران", "رحلة جوية", "تذكرة طيران", "الرحلة الجوية", "flight", "flights", "airfare", "air ticket"],
  accommodation: ["فندق", "فنادق", "إقامة", "نزل", "منتجع", "شقة", "شقق", "hotel", "hotels", "resort", "apartment", "stay", "accommodation", "lodging"],
  transport: ["مواصلات", "نقل", "توصيل", "استقبال", "تنقل", "تنقلات", "ترحيل", "transfer", "transfers", "transport", "transportation", "pickup", "pick-up", "pick up", "shuttle"],
  transportType: ["خاص", "خاصة", "مشترك", "مشتركة", "private", "shared", "sic", "seat in coach", "seat-in-coach"],
  multiCity: ["عدة مدن", "مدينتين", "مدينتان", "أكثر من مدينة", "عدة فنادق", "فندقين", "فندقان", "أكثر من فندق", "التنقل بين المدن", "multi-city", "multi city", "two cities", "several cities", "two hotels", "multiple hotels", "city to city"],
  roomType: ["نوع الغرفة", "غرفة مزدوجة", "غرفة فردية", "غرفة ثلاثية", "توأم", "سرير مزدوج", "سرير مفرد", "أسرّة", "اسرة", "جناح", "double room", "single room", "twin", "triple", "suite", "king bed", "queen bed", "room type", "bedroom"],
  children: ["أطفال", "طفل", "الأطفال", "رضيع", "رضّع", "children", "child", "kids", "infant", "toddler"],
  childBeds: ["سرير إضافي", "أسرّة الأطفال", "اسرة الاطفال", "سرير الطفل", "مهد", "extra bed", "child bed", "children bed", "cot", "crib"],
  meals: ["وجبات", "الوجبات", "إفطار", "الافطار", "الإفطار", "نصف إقامة", "إقامة كاملة", "عشاء", "غداء", "meals", "breakfast", "half board", "full board", "all inclusive", "bed and breakfast"],
  flightTimes: ["مواعيد الرحلة", "موعد الإقلاع", "موعد الوصول", "توقيت الرحلة", "الإقلاع", "الهبوط", "ترانزيت", "توقف", "departure time", "arrival time", "flight time", "layover", "stopover", "transit", "direct flight", "nonstop", "non-stop"],
  transit: ["ترانزيت", "عبور", "توقف", "تتوقف", "layover", "stopover", "transit", " stop", "stops"],
  arrivalFees: ["رسوم عند الوصول", "تدفع عند الوصول", "تُدفع في المطار", "رسوم إضافية عند الوصول", "pay on arrival", "payable on arrival", "arrival fee", "arrival fees", "at the airport"],
  excluded: ["غير مشمول", "غير شامل", "لا يشمل", "مستثنى", "مستثناة", "غير مشمولة", "not included", "excluded", "excludes", "excluding", "exclusions"],
  visa: ["تأشيرة", "التأشيرة", "فيزا", "الفيزا", "رسوم تأشيرة", "إصدار التأشيرة", "visa"],
  insurance: ["تأمين", "التأمين", "تأمين سفر", "insurance", "travel insurance"],
} as const;

function makeMatcher(text?: string): (needles: readonly string[]) => boolean {
  if (!text) return () => false;
  const lower = text.toLowerCase();
  return (needles) => needles.some((n) => lower.includes(n.toLowerCase()));
}

export function deriveQuestionContext(facts: ExtractedOfferFacts, text?: string): QuestionContext {
  const has = makeMatcher(text);

  const transferConfirmed = facts.transfer !== undefined;
  const transportMentionedInText = has(KEYWORDS.transport);
  const flightFact = facts.flight?.value.included === true;
  const childrenFact = (facts.travelers?.value.children ?? 0) > 0;

  return {
    hasFlight: flightFact || has(KEYWORDS.flight),
    hasAccommodation: facts.board !== undefined || has(KEYWORDS.accommodation),
    transferConfirmed,
    transportMentionedInText,
    transportTypeKnown: has(KEYWORDS.transportType),
    multiCityOrHotel: has(KEYWORDS.multiCity),
    roomTypeMentioned: facts.roomType !== undefined || has(KEYWORDS.roomType),
    hasChildren: childrenFact || has(KEYWORDS.children),
    childBedsMentioned: has(KEYWORDS.childBeds),
    mealsMentioned: facts.board !== undefined || has(KEYWORDS.meals),
    flightTimesKnown: has(KEYWORDS.flightTimes),
    transitMentioned:
      facts.transitDuration !== undefined || facts.stopCount !== undefined || has(KEYWORDS.transit),
    transitDurationKnown: facts.transitDuration !== undefined,
    stopCountKnown: facts.stopCount !== undefined,
    airportChangeKnown: facts.airportChange !== undefined,
    arrivalFeesMentioned: has(KEYWORDS.arrivalFees),
    excludedServicesMentioned: has(KEYWORDS.excluded),
    visaMentioned: facts.visa !== undefined || has(KEYWORDS.visa),
    insuranceMentioned: facts.insurance !== undefined || has(KEYWORDS.insurance),
  };
}
