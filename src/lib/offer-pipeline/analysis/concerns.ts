/**
 * Inferred concerns — points worth checking that the offer does NOT state as
 * facts. Each one is derived from something the offer does state (its
 * destination, a word it uses) and says so in `basis`, so the reader can see
 * why it was raised. A concern is never a finding that a service is missing,
 * excluded or misrepresented, and never carries a time, price or guarantee
 * the offer did not give.
 *
 * Deterministic: plain substring checks on the original text, no scoring.
 */

import type { Bi, ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import type { InferredConcern } from "./types";

const has = (text: string, lower: string, words: readonly string[]) =>
  words.some((word) => (/[a-z]/.test(word) ? lower.includes(word) : text.includes(word)));

/** Words that turn a nearby mention into a denial ("بدون عربون", "no deposit"). */
const NEGATORS = ["بدون", "بلا", "دون", "لا يوجد", "لا يُطلب", "لا يطلب", "غير مطلوب", "ليس هناك", "no ", "without", "not required", "none"];

/**
 * True when the text mentions one of `words` somewhere it is NOT denied. An
 * offer that says "بدون عربون" or "no deposit required" states the opposite of
 * the concern, so it must not raise it.
 */
function mentionsUnnegated(text: string, lower: string, words: readonly string[]): boolean {
  const WINDOW = 30;
  for (const word of words) {
    const latin = /[a-z]/.test(word);
    const haystack = latin ? lower : text;
    for (let at = haystack.indexOf(word); at !== -1; at = haystack.indexOf(word, at + 1)) {
      const around = haystack.slice(Math.max(0, at - WINDOW), at + word.length + WINDOW);
      const aroundLower = latin ? around : around.toLowerCase();
      if (!NEGATORS.some((negator) => (/[a-z]/.test(negator) ? aroundLower : around).includes(negator))) return true;
    }
  }
  return false;
}

const SEAPLANE = ["طائرة مائية", "الطائرة المائية", "بالطائرة المائية", "طيران مائي", "seaplane", "sea plane"];
const FLIGHT_WORDS = ["طيران", "رحلة", "تذاكر", "وصول", "flight", "arrival", "ticket"];
const DEPOSIT = ["عربون", "دفعة مقدمة", "دفعة أولى", "deposit", "down payment"];
const PAYMENT = ["الدفع", "دفع", "سداد", "تقسيط", "payment", "pay "];
const OR_SIMILAR = ["أو ما يماثله", "أو ما يعادله", "او ما يعادله", "او ما يماثله", "أو مشابه", "أو فندق مماثل", "or similar", "or equivalent"];
const NON_REFUNDABLE = ["غير قابل للاسترداد", "غير مسترد", "غير قابلة للاسترداد", "لا يسترد", "non-refundable", "non refundable", "nonrefundable"];

/** Meal-plan codes the board rule normalizes to, with the plain names used in a concern's basis. */
const BOARD_NAMES: Readonly<Record<string, Bi>> = {
  RO: { ar: "بدون وجبات", en: "room only" },
  BB: { ar: "الإفطار", en: "breakfast" },
  HB: { ar: "نصف إقامة", en: "half board" },
  FB: { ar: "إقامة كاملة", en: "full board" },
  AI: { ar: "شامل كليًا", en: "all inclusive" },
};
/** Plans that leave some daily meals to be bought at the resort. */
const PARTIAL_BOARDS = new Set(["RO", "BB", "HB"]);

function maldivesBasis(facts: ExtractedOfferFacts, text: string, lower: string): Bi | null {
  if (facts.destination?.value.countryCode === "MV") {
    return { ar: "العرض لوجهة في المالديف.", en: "The offer is for a Maldives destination." };
  }
  if (has(text, lower, SEAPLANE)) {
    return { ar: "العرض يذكر انتقالًا بالطائرة المائية.", en: "The offer mentions a seaplane transfer." };
  }
  return null;
}

export function buildInferredConcerns(facts: ExtractedOfferFacts, text = ""): InferredConcern[] {
  const lower = text.toLowerCase();
  const concerns: InferredConcern[] = [];

  const islandBasis = maldivesBasis(facts, text, lower);
  if (islandBasis) {
    const flightInOffer = Boolean(facts.flight) || has(text, lower, FLIGHT_WORDS);
    concerns.push({
      key: "resortTransferTiming",
      title: {
        ar: "طابق وقت وصول رحلتك الدولية مع انتقال المنتجع",
        en: "Match your international arrival time with the resort transfer",
      },
      detail: {
        ar: "الانتقال إلى منتجعات المالديف يكون بالطائرة المائية أو بالقارب أو برحلة داخلية ثم قارب، ولكل منتجع ومشغّل مواعيده وشروطه. أضف وقت إجراءات المطار واستلام الأمتعة. لا يوجد موعد نهائي واحد يصلح لكل المنتجعات، والعرض لا يضمن اللحاق بالانتقال في يوم الوصول إلا إذا ذكر ذلك صراحة. إذا فات الانتقال فقد تحتاج ليلة قرب المطار.",
        en: "Transfers to Maldives resorts run by seaplane, boat, or a domestic flight then boat, and each resort and operator sets its own schedule and conditions. Add airport processing and baggage time. No single cutoff fits every resort, and the offer does not guarantee a same-day connection unless it says so. If the transfer is missed you may need a night near the airport.",
      },
      basis: flightInOffer
        ? {
            ar: `${islandBasis.ar} ويذكر الطيران أو الوصول.`,
            en: `${islandBasis.en} It also mentions flights or arrival.`,
          }
        : islandBasis,
      question: {
        ar: "ما آخر موعد لوصول الرحلة الدولية حتى نلحق انتقال المنتجع في يوم الوصول؟ ونوع الانتقال (طائرة مائية أم قارب أم رحلة داخلية)؟ وإذا فاتنا، من يتحمل الليلة الإضافية والانتقال البديل؟",
        en: "What is the latest international arrival time that still makes the resort transfer on arrival day, and which transfer is it (seaplane, boat, or domestic flight)? If we miss it, who covers the extra night and the alternative transfer?",
      },
    });
    if (has(text, lower, SEAPLANE)) {
      concerns.push({
        key: "seaplaneBaggage",
        title: { ar: "حد الأمتعة في الطائرة المائية", en: "Seaplane baggage allowance" },
        detail: {
          ar: "حد الأمتعة في الطائرة المائية يحدده المشغّل وقد يختلف عن حد رحلتك الدولية، وقد تُفرض رسوم على الزيادة.",
          en: "The seaplane operator sets its own baggage allowance, which can differ from your international flight, and excess may be charged.",
        },
        basis: { ar: "العرض يذكر انتقالًا بالطائرة المائية.", en: "The offer mentions a seaplane transfer." },
        question: {
          ar: "ما حد الأمتعة المسموح في الطائرة المائية لكل شخص، وكم رسوم الوزن الزائد إن وُجدت؟",
          en: "What is the seaplane baggage allowance per person, and what is the excess charge, if any?",
        },
      });
    }
    const board = facts.board?.value;
    if (board && PARTIAL_BOARDS.has(board)) {
      concerns.push({
        key: "resortMeals",
        title: { ar: "الوجبات غير المشمولة تُدفع داخل المنتجع", en: "Meals not included are paid at the resort" },
        detail: {
          ar: "في منتجعات الجزر لا توجد غالبًا مطاعم خارج المنتجع، فالوجبات غير المشمولة في الباقة تُشترى من المنتجع بأسعاره.",
          en: "Island resorts usually have no restaurants outside the resort, so meals the package does not include are bought at resort prices.",
        },
        basis: {
          ar: `خطة الوجبات المذكورة: ${BOARD_NAMES[board].ar}.`,
          en: `Stated meal plan: ${BOARD_NAMES[board].en}.`,
        },
        question: {
          ar: "ما الوجبات والمشروبات المشمولة بالضبط، وكم تكلفة ترقية خطة الوجبات إن احتجناها؟",
          en: "Exactly which meals and drinks are included, and what would a meal-plan upgrade cost?",
        },
      });
    }
  }

  if (mentionsUnnegated(text, lower, DEPOSIT)) {
    concerns.push({
      key: "depositTerms",
      title: { ar: "شروط العربون", en: "Deposit terms" },
      detail: {
        ar: "العرض يطلب عربونًا أو دفعة مقدمة. ثبّت كتابيًا هل هو مسترد، ومتى يُستحق باقي المبلغ.",
        en: "The offer asks for a deposit or advance payment. Confirm in writing whether it is refundable and when the balance is due.",
      },
      basis: { ar: "العرض يذكر عربونًا أو دفعة مقدمة.", en: "The offer mentions a deposit or advance payment." },
      question: {
        ar: "كم العربون، وهل يُسترد عند الإلغاء، ومتى موعد سداد باقي المبلغ؟",
        en: "How much is the deposit, is it refundable on cancellation, and when is the balance due?",
      },
    });
  } else if ((facts.totalPrice || facts.price) && !has(text, lower, PAYMENT)) {
    concerns.push({
      key: "paymentSchedule",
      title: { ar: "طريقة الدفع وموعده غير مذكورين", en: "Payment method and timing are not stated" },
      detail: {
        ar: "العرض يذكر سعرًا لكنه لا يذكر متى وكيف يُدفع. هذا لا يعني وجود شرط مخفي، لكنه معلومة تحتاج تثبيتًا قبل الدفع.",
        en: "The offer states a price but not when or how it is paid. That is not evidence of a hidden term, but it needs confirming before paying.",
      },
      basis: { ar: "العرض يذكر سعرًا ولا يذكر شروط الدفع.", en: "The offer states a price but no payment terms." },
      question: {
        ar: "ما طريقة الدفع، وهل يلزم دفع المبلغ كاملًا الآن أم على دفعات، وما مواعيدها؟",
        en: "How is payment made, is the full amount due now or in instalments, and when?",
      },
    });
  }

  if (has(text, lower, OR_SIMILAR)) {
    concerns.push({
      key: "hotelSubstitution",
      title: { ar: "الفندق قد يُستبدل بفندق مماثل", en: "The hotel may be substituted" },
      detail: {
        ar: "عبارة «أو ما يعادله» تعني أن الفندق المذكور غير مضمون. اطلب اسم الفندق النهائي قبل الدفع.",
        en: "“Or similar” means the named hotel is not guaranteed. Ask for the final hotel name before paying.",
      },
      basis: { ar: "العرض يستخدم عبارة «أو ما يعادله» أو ما يشبهها.", en: "The offer uses “or similar” or equivalent wording." },
      question: {
        ar: "ما اسم الفندق المؤكد، وهل يحق لكم تغييره بعد الدفع؟",
        en: "Which hotel is confirmed, and can you change it after payment?",
      },
    });
  }

  if (has(text, lower, NON_REFUNDABLE)) {
    concerns.push({
      key: "nonRefundable",
      title: { ar: "جزء من العرض غير قابل للاسترداد", en: "Part of the offer is non-refundable" },
      detail: {
        ar: "حدد أي جزء بالضبط غير مسترد (الطيران أو الفندق أو الباقة كاملة)، ومتى يبدأ ذلك.",
        en: "Pin down exactly which part is non-refundable (flight, hotel, or the whole package) and from when.",
      },
      basis: { ar: "العرض يذكر أن شيئًا غير قابل للاسترداد.", en: "The offer says something is non-refundable." },
      question: {
        ar: "أي جزء من العرض غير قابل للاسترداد بالضبط، وهل يمكن تعديل التواريخ بدل الإلغاء؟",
        en: "Exactly which part is non-refundable, and can dates be changed instead of cancelling?",
      },
    });
  }

  return concerns;
}
