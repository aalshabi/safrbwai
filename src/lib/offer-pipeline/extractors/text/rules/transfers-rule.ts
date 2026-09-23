/**
 * TransfersRule — extracts whether airport transfers are included. Explicit
 * negation → false; an explicit provided transfer (private/shared/included) →
 * true. A bare mention without status is not extracted (warning instead).
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion } from "../signals";
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
    `|(?:airport\\s*)?transfers?[^.\\n]{0,20}?included` +
    `|includes?\\s*(?:airport\\s*)?transfers?` +
    `|(?:private|shared|complimentary|free)\\s*(?:airport\\s*)?transfers?` +
    `|shared\\s*shuttle|meet\\s*(?:and|&)\\s*greet`,
  "i"
);

const MENTION = new RegExp(`${TRANSFER_WORD}|transfers?`, "i");

export const transfersRule: ExtractionRule = {
  key: "transfer",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE);
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
