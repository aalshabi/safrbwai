/**
 * Shared pure helper for "included vs excluded" boolean signals (insurance,
 * visa, transfers, flight, taxes). The EXCLUDED pattern is checked first because
 * a negation such as "غير مشمول" / "not included" contains the affirmative
 * substring. When neither a clear inclusion nor exclusion is found, returns null
 * (no guess).
 *
 * An inclusion match is then checked against its own clause, because a rule's
 * INCLUDE pattern can match inside a negated phrase ("لا يشمل الطيران" contains
 * "يشمل الطيران"):
 * - a negator directly before it, or a negative status directly after it, makes
 *   it an exclusion;
 * - a negative status later in the same clause makes the statement ambiguous,
 *   so no fact is returned rather than a wrong one.
 */

export interface InclusionMatch {
  value: boolean;
  evidence: string;
}

/** A negating word ending right before the match ("لا يشمل", "غير شامل", "does not include"). */
const NEGATOR_BEFORE =
  /(?:^|[\s(«"'])(و?(?:لا|غير|ليس|ليست|بدون|دون)|not|no|without|excluding|doesn['’]t|don['’]t|isn['’]t|aren['’]t)\s+$/i;

/** A negative status phrase ("غير مشمول", "not included", "غير متوفرة"). */
const NEGATIVE_STATUS =
  /(?:(?:is|are)\s+)?(?:not\s+(?:included|provided|available)|excluded|غير\s*(?:مشمول|مشمولة|شامل|شاملة|متوفر|متوفرة|متاح|متاحة))/i;

/** Where a clause ends: sentence punctuation, Arabic and Latin commas, line breaks. */
const CLAUSE_END = /[.،,;؛!?؟\n]/;

export function detectInclusion(
  text: string,
  includeRe: RegExp,
  excludeRe: RegExp
): InclusionMatch | null {
  const ex = excludeRe.exec(text);
  if (ex) return { value: false, evidence: text.slice(ex.index, ex.index + ex[0].length) };

  const inc = includeRe.exec(text);
  if (!inc) return null;

  const start = inc.index;
  const end = inc.index + inc[0].length;

  const negator = NEGATOR_BEFORE.exec(text.slice(0, start));
  if (negator) {
    const negatorStart = negator.index + negator[0].indexOf(negator[1]);
    return { value: false, evidence: text.slice(negatorStart, end) };
  }

  const rest = text.slice(end);
  const clauseEnd = rest.search(CLAUSE_END);
  const clause = clauseEnd < 0 ? rest : rest.slice(0, clauseEnd);
  const status = NEGATIVE_STATUS.exec(clause);
  if (status) {
    if (clause.slice(0, status.index).trim() === "") {
      return { value: false, evidence: text.slice(start, end + status.index + status[0].length) };
    }
    return null;
  }

  return { value: true, evidence: text.slice(start, end) };
}
