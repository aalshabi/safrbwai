/**
 * InsuranceRule — extracts whether travel insurance is included. A bare mention
 * of "insurance"/"تأمين" without an inclusion/exclusion signal is NOT extracted;
 * instead a warning is added.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { detectInclusion } from "../signals";
import { exact } from "../utils";

const EXCLUDE = /(?:تأمين[^.،\n]{0,20}?(?:غير\s*مشمول|غير\s*شامل|على\s*حساب(?:ك|كم)?))|بدون\s*تأمين|insurance[^.\n]{0,20}?(?:not\s*included|excluded)|no\s*insurance/i;
const INCLUDE = /تأمين[^.،\n]{0,20}?(?:مشمول|شامل|مضمّن|مجاني)|شامل[^.،\n]{0,20}?التأمين|insurance[^.\n]{0,20}?included|includes?\s*insurance/i;
const MENTION = /تأمين|insurance/i;

export const insuranceRule: ExtractionRule = {
  key: "insurance",
  apply(text: string): RuleResult {
    const hit = detectInclusion(text, INCLUDE, EXCLUDE, MENTION);
    if (hit) return { facts: { insurance: exact(hit.value, hit.evidence) }, warnings: [] };

    if (MENTION.test(text)) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكر التأمين دون توضيح إن كان مشمولًا، فلم تُستخرج حقيقة.",
            en: "Insurance was mentioned without stating inclusion; no fact extracted.",
          },
        ],
      };
    }

    return { facts: {}, warnings: [] };
  },
};
