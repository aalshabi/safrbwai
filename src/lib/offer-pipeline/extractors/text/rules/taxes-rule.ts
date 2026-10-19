/**
 * TaxesRule — extracts whether taxes/fees are stated as included in the price.
 * Explicit exclusion wins over inclusion (a negation contains the affirmative
 * substring). A bare mention of "ضرائب" without a status yields a warning, not
 * a fact — the pipeline never guesses.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion, listedAsIncluded } from "../signals";
import { exact } from "../utils";

const EXCLUDE =
  /(?:غير\s*شامل|غير\s*شاملة|لا\s*يشمل|غير\s*مشمول(?:ة)?|إضافة\s*إلى)\s*(?:ال)?(?:ضرائب|ضريبة|رسوم)|(?:ال)?(?:ضرائب|الرسوم)[^.،\n]{0,20}?(?:غير\s*مشمول(?:ة)?|غير\s*شاملة|تُدفع\s*منفصل)|(?:excluding|not\s*includ\w*|plus)\s*(?:all\s*)?(?:taxes|fees|vat)|(?:taxes|fees)[^.\n]{0,20}?not\s*included/i;

const INCLUDE =
  /(?:شامل(?:ة)?|يشمل|تشمل|بما\s*في\s*ذلك)\s*(?:جميع\s*)?(?:ال)?(?:ضرائب|ضريبة|رسوم)|(?:ال)?(?:ضرائب|الرسوم)[^.،\n]{0,20}?مشمول(?:ة)?|(?:includ\w*|inclusive\s*of)\s*(?:all\s*)?(?:taxes|fees|vat)|(?:taxes|fees)[^.\n]{0,20}?included/i;

const MENTION = /ضرائب|ضريبة|رسوم|taxes|vat|fees/i;

/** Taxes proper: «رسوم دخول المزارات» in an included or excluded list is not a tax statement. */
const TAX_WORD = /ضرائب|ضريبة|\btaxes\b|\bvat\b/i;

export const taxesRule: ExtractionRule = {
  key: "taxes",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE, TAX_WORD) ?? listedAsIncluded(text, TAX_WORD);
    if (hit) return { facts: { taxes: exact({ included: hit.value }, hit.evidence) }, warnings: [] };

    if (MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكرت الضرائب/الرسوم دون توضيح إن كانت مشمولة، فلم تُستخرج حقيقة.",
            en: "Taxes/fees were mentioned without stating inclusion; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
