/**
 * TransfersRule — extracts whether airport transfers are included. Explicit
 * negation → false; an explicit provided transfer (private/shared/included) →
 * true. A bare mention without status is not extracted (warning instead).
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion, listedAsIncluded, type InclusionMatch } from "../signals";
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

/** A ground transfer as a list item; «النقل الجوي» (air transport) is a flight, not a transfer. */
const LISTED_TRANSFER = new RegExp(`(?:${TRANSFER_WORD})(?!\\s*(?:ال)?جوي)|transfers?`, "i");

/**
 * A transfer its own clause offers for a fee, on request, or says is unavailable
 * ("Seaplane transfers available for an additional charge", «لا تتوفر خدمة
 * الاستقبال في المطار») is not a package inclusion.
 */
const NOT_PROVIDED =
  /رسوم\s*إضافية|بتكلفة\s*إضافية|مقابل\s*(?:رسوم|مبلغ)|اختياري|عند\s*الطلب|لا\s*[تي]توفر|غير\s*(?:متوفر|متاح)|additional\s*(?:charge|cost|fee)|extra\s*(?:charge|cost|fee)|optional|on\s*request|not\s*available|unavailable/i;

/** The span of the clause holding `evidence`: "Airport transfers included; excursions optional" → "Airport transfers included". */
function clauseOf(text: string, evidence: string): { start: number; end: number } | null {
  const at = text.indexOf(evidence);
  if (at < 0) return null;
  const before = text.slice(0, at);
  const after = text.slice(at + evidence.length);
  const start = Math.max(...[...".،,;؛!?؟\n"].map((c) => before.lastIndexOf(c))) + 1;
  const end = after.search(/[.،,;؛!?؟\n]/);
  return { start, end: at + evidence.length + (end < 0 ? after.length : end) };
}

/**
 * The first inclusion that its clause does not sell as optional or paid. An
 * optional match ("Seaplane transfers available for an additional charge.")
 * is blanked out and the scan goes on, so a later "Airport transfers
 * included." is still found.
 */
function providedInclusion(text: string): InclusionMatch | null {
  let scanned = text;
  for (let i = 0; i < 10; i++) {
    const found = detectInclusion(scanned, INCLUDE, EXCLUDE, LISTED_TRANSFER) ?? listedAsIncluded(scanned, LISTED_TRANSFER);
    if (!found?.value) return found;
    const clause = clauseOf(scanned, found.evidence);
    if (!clause || !NOT_PROVIDED.test(scanned.slice(clause.start, clause.end))) return found;
    scanned = scanned.slice(0, clause.start) + " ".repeat(clause.end - clause.start) + scanned.slice(clause.end);
  }
  return null;
}

export const transfersRule: ExtractionRule = {
  key: "transfer",
  apply(text: string): RuleResult {
    const hit = providedInclusion(text);
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
