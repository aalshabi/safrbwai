/**
 * TransfersRule — extracts whether airport transfers are included. Explicit
 * negation → false; an explicit provided transfer (private/shared/included) →
 * true. A bare mention without status is not extracted (warning instead).
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion, listedAsIncluded } from "../signals";
import { exact } from "../utils";

/** The words an Arabic offer uses for ground transport. */
const TRANSFER_WORD = "التوصيل|توصيل|التوديع|توديع|الاستقبال|استقبال|المواصلات|مواصلات|التنقلات|تنقلات|النقل|نقل|الترحيل|ترحيل|ترانسفير";

const EXCLUDE = new RegExp(
  `(?:${TRANSFER_WORD}|transfers?)[^.،\\n]{0,20}?(?:غير\\s*مشمول|غير\\s*شامل|not\\s*included|excluded)` +
    `|بدون\\s*(?:${TRANSFER_WORD})|no\\s*transfers?`,
  "i"
);

const INCLUDE = new RegExp(
  // "استقبال وتوديع"، "استقبال وتوصيل" — the meet-and-greet pair is itself the statement.
  `(?:${TRANSFER_WORD})\\s*و\\s*(?:${TRANSFER_WORD})` +
    // "شامل التنقلات"، "يشمل النقل"، "تشمل المواصلات"
    `|(?:شامل|شاملة|يشمل|تشمل|مع)\\s*(?:${TRANSFER_WORD})` +
    // "التنقلات مشمولة"، "النقل مشمول"
    `|(?:${TRANSFER_WORD})\\s*(?:مشمول|مشمولة|شامل|شاملة|مجاني|مجانية)` +
    // "توصيل من وإلى المطار"، "استقبال من المطار"
    `|(?:${TRANSFER_WORD})\\s*(?:خاص|مشترك)` +
    `|(?:${TRANSFER_WORD})\\s*(?:من\\s*و?\\s*)?(?:إلى\\s*|الى\\s*)?المطار` +
    // "الاستقبال والمساعدة في المطار"
    `|(?:الاستقبال|استقبال)[^.،\\n]{0,25}?(?:في|من|إلى|الى)\\s*المطار` +
    // "نقل ذهابًا وإيابًا بالطائرة المائية"، "نقل بالقارب السريع"
    `|(?:${TRANSFER_WORD})\\s*ذهاب[ًا]*\\s*و\\s*إياب[ًا]*` +
    `|(?:${TRANSFER_WORD})[^.،\\n]{0,30}?(?:بالطائرة\\s*المائية|بالقارب\\s*السريع)` +
    `|(?:seaplane|speedboat)\\s*transfers?` +
    `|(?:airport\\s*)?transfers?[^.\\n]{0,20}?included` +
    `|includes?\\s*(?:airport\\s*)?transfers?` +
    `|includes?[^.\\n]{0,40}?(?:airport\\s*)?transfers?` +
    `|(?:private|shared|complimentary|free)\\s*(?:airport\\s*)?transfers?` +
    `|shared\\s*shuttle|meet\\s*(?:and|&)\\s*greet`,
  "i"
);

const MENTION = new RegExp(`${TRANSFER_WORD}|transfers?`, "i");

/**
 * A transfer the line offers for a fee, on request, or says is unavailable
 * ("Seaplane transfers available for an additional charge", «لا تتوفر خدمة
 * الاستقبال في المطار») is not a package inclusion.
 */
const NOT_PROVIDED =
  /رسوم\s*إضافية|بتكلفة\s*إضافية|مقابل\s*(?:رسوم|مبلغ)|اختياري|عند\s*الطلب|لا\s*[تي]توفر|غير\s*(?:متوفر|متاح)|additional\s*(?:charge|cost|fee)|extra\s*(?:charge|cost|fee)|optional|on\s*request|not\s*available|unavailable/i;

function lineOf(text: string, evidence: string): string {
  const at = text.indexOf(evidence);
  if (at < 0) return evidence;
  const start = text.lastIndexOf("\n", at - 1) + 1;
  const end = text.indexOf("\n", at + evidence.length);
  return text.slice(start, end < 0 ? undefined : end);
}

export const transfersRule: ExtractionRule = {
  key: "transfer",
  apply(text: string): RuleResult {
    const found = detectInclusion(text, INCLUDE, EXCLUDE) ?? listedAsIncluded(text, MENTION);
    const hit = found?.value && NOT_PROVIDED.test(lineOf(text, found.evidence)) ? null : found;
    if (hit) return { facts: { transfer: exact({ included: hit.value }, hit.evidence) }, warnings: [] };

    if (MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكر التوصيل دون توضيح إن كان مشمولًا، فلم تُستخرج حقيقة.",
            en: "Transfer was mentioned without stating inclusion; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
