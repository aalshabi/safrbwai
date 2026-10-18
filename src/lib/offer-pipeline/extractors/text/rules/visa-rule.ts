/**
 * VisaRule — extracts whether the entry visa is included. A bare mention of
 * "visa"/"تأشيرة" without an inclusion/exclusion signal is NOT extracted;
 * instead a warning is added.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion } from "../signals";
import { exact } from "../utils";

const EXCLUDE = /(?:تأشيرة[^.،\n]{0,20}?(?:غير\s*مشمول|غير\s*شامل|على\s*حساب(?:ك|كم)?))|بدون\s*تأشيرة|visa[^.\n]{0,20}?(?:not\s*included|excluded)|no\s*visa/i;
const INCLUDE = /تأشيرة[^.،\n]{0,20}?(?:مشمول|شامل|مضمّن|مجاني)|شامل[^.،\n]{0,20}?التأشيرة|مع\s*التأشيرة|visa[^.\n]{0,20}?included|includes?\s*visa/i;
const MENTION = /تأشيرة|visa/i;

export const visaRule: ExtractionRule = {
  key: "visa",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE, MENTION);
    if (hit) return { facts: { visa: exact(hit.value, hit.evidence) }, warnings: [] };

    if (MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكرت التأشيرة دون توضيح إن كانت مشمولة، فلم تُستخرج حقيقة.",
            en: "Visa was mentioned without stating inclusion; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
