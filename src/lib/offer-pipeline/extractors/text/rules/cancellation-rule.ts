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
  `(?:إلغاء\\s*مجاني|الإلغاء\\s*مجاني|قابل\\s*لل(?:إلغاء|استرداد)|غير\\s*قابل\\s*لل(?:إلغاء|استرداد)|غير\\s*مسترد(?:ة)?|سياسة\\s*الإلغاء[^.\\n]{0,${TAIL_MAX}}|رسوم\\s*إلغاء|free\\s*cancellation|non[-\\s]?refundable|refundable|cancellation\\s*policy[^.\\n]{0,${TAIL_MAX}}|cancellation\\s*fees?)`,
  "i"
);

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** True when a capped tail stopped between two letters of the same word. */
function endsMidWord(text: string, end: number): boolean {
  return WORD_CHAR.test(text.charAt(end - 1)) && WORD_CHAR.test(text.charAt(end));
}

export const cancellationRule: ExtractionRule = {
  key: "cancellationPolicy",
  apply(text: string): RuleResult {
    const m = POLICY.exec(text);
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
