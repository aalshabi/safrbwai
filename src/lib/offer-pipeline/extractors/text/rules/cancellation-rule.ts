/**
 * CancellationRule — extracts the cancellation/refund terms EXACTLY as stated.
 * The value is the matched phrase itself (never paraphrased, never interpreted
 * into a policy class), so the user always sees the offer's own wording.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { exact } from "../utils";

/**
 * How far a "سياسة الإلغاء: …" / "Cancellation policy: …" label reads into its
 * sentence. A shorter cap cut real policies mid-word («قبل 14 يومًا من الس»),
 * so the tail now runs to the sentence end and, only when it is longer than
 * this, is cut back to the last whole word.
 */
const TAIL_MAX = 120;

const POLICY = new RegExp(
  `(?:إلغاء\\s*مجاني|الإلغاء\\s*مجاني|قابل[ةه]?\\s*لل(?:إلغاء|استرداد)|غير\\s*قابل[ةه]?\\s*لل(?:إلغاء|استرداد)|غير\\s*مسترد(?:ة)?|سياسة\\s*الإلغاء[^.\\n]{0,${TAIL_MAX}}|رسوم\\s*إلغاء|free\\s*cancellation|non[-\\s]?refundable|refundable|cancellation\\s*policy[^.\\n]{0,${TAIL_MAX}}|cancellation\\s*fees?)`,
  "i"
);

/** A label that explicitly says the policy is absent is not a policy fact. */
const ARABIC_POLICY_LABEL = "(?:سياسة\\s*(?:ال)?إلغاء|شروط\\s*(?:ال)?إلغاء)";
const ARABIC_ABSENT_DESCRIPTION =
  "(?:غير\\s*(?:مذكور(?:ة)?|موضح(?:ة)?|متوفر(?:ة)?|متاح(?:ة)?|محدد(?:ة)?|معروف(?:ة)?)" +
  "|لم\\s*(?:يتم\\s*)?(?:ذكر(?:ها)?|تذكر|تُذكر|توضيح(?:ها)?|توضح|تُوضح|تقديم(?:ها)?)" +
  "|لا\\s*(?:توجد|يوجد)|(?:ليست|ليس)\\s*(?:مذكور(?:ة)?|موضح(?:ة)?|متوفر(?:ة)?|متاح(?:ة)?|محدد(?:ة)?|معروف(?:ة)?))";
const ARABIC_ABSENT_PREFIX =
  "(?:لم\\s*(?:يتم\\s*)?(?:ذكر|توضيح|تقديم)|لا\\s*(?:توجد|يوجد))";
const ENGLISH_POLICY_LABEL = "(?:cancellation|refund)\\s+(?:policy|terms?)";
const ENGLISH_NEGATED_AUXILIARY =
  "(?:(?:is|are|was|were|has|have|had)\\s+not|(?:is|are|was|were|has|have|had)n['’]t)";
const ENGLISH_ABSENT_DESCRIPTION =
  `(?:${ENGLISH_NEGATED_AUXILIARY}(?:\\s+been)?\\s+(?:stated|provided|available|specified|mentioned|disclosed|included|given)` +
  "|not\\s+(?:stated|provided|available|specified|mentioned|disclosed|included|given|applicable)" +
  "|(?:(?:is|are|was|were)\\s+)?(?:missing|unavailable|unspecified|unknown)" +
  "|(?:none|n/?a)(?=\\s*(?:$|[.،,؛;!?\\n])))";
const POLICY_ABSENT = new RegExp(
  `(?:${ARABIC_POLICY_LABEL}\\s*[:：\\-–—]?\\s*${ARABIC_ABSENT_DESCRIPTION}` +
    `|${ARABIC_ABSENT_PREFIX}\\s+${ARABIC_POLICY_LABEL}` +
    `|\\b${ENGLISH_POLICY_LABEL}\\b\\s*[:：\\-–—]?\\s*${ENGLISH_ABSENT_DESCRIPTION}` +
    `|\\bno\\s+${ENGLISH_POLICY_LABEL}\\b(?:\\s+(?:is|are|was|were)\\s+(?:stated|provided|available|specified))?)`,
  "giu"
);

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** True when a capped tail stopped between two letters of the same word. */
function endsMidWord(text: string, end: number): boolean {
  return WORD_CHAR.test(text.charAt(end - 1)) && WORD_CHAR.test(text.charAt(end));
}

export const cancellationRule: ExtractionRule = {
  key: "cancellationPolicy",
  apply(text: string): RuleResult {
    const searchable = text.replace(POLICY_ABSENT, (absence) => " ".repeat(absence.length));
    const m = POLICY.exec(searchable);
    if (!m) return { facts: {}, warnings: [] };

    let end = m.index + m[0].length;
    if (endsMidWord(text, end)) {
      // Never end the verbatim evidence inside a word.
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > m.index) end = lastSpace;
    }
    const evidence = text.slice(m.index, end).trim();
    if (!evidence) return { facts: {}, warnings: [] };

    return { facts: { cancellationPolicy: exact(evidence, evidence) }, warnings: [] };
  },
};
