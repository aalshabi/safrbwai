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

/**
 * A negating word ending right before the match ("لا يشمل", "غير شامل", "does not include").
 *
 * The Arabic negator may carry the conjunction «و»/«ف» ("ولا يشمل", "فلا يشمل",
 * "فغير شامل"). It may also follow any non-letter glued to it — a list marker
 * such as "-", "–", "•", "1-" or "2)" ("-غير شامل الطيران") — but never a
 * letter or a diacritic, so «لا» inside «بلا» or «علا» is not a negator.
 */
const NEGATOR_BEFORE =
  /(?:^|[^\p{L}\p{M}])((?:[وف]\p{M}*)?(?:لا|غير|ليس|ليست|بدون|دون)|not|no|without|excluding|doesn['’]t|don['’]t|isn['’]t|aren['’]t)\s+$/iu;

/** A negative status phrase ("غير مشمول", "not included", "غير متوفرة"). */
const NEGATIVE_STATUS =
  /(?:(?:is|are)\s+)?(?:not\s+(?:included|provided|available)|excluded|غير\s*(?:مشمول|مشمولة|شامل|شاملة|متوفر|متوفرة|متاح|متاحة))/i;

/** Where a clause ends: sentence punctuation, Arabic and Latin commas, line breaks. */
const CLAUSE_END = /[.،,;؛!?؟\n]/;

/** A heading that introduces what the offer does NOT include. */
const EXCLUDED_HEADING =
  /(?:غير\s*(?:مشمول|مشمولة|شامل|شاملة)|لا\s*(?:يشمل|تشمل)|الاستثناءات|استثناءات|مستثنى|not\s+included|excludes?|exclusions)/i;
/** A list item: "- …", "• …", "* …", "1. …", "2) …". */
const LIST_ITEM = /^\s*(?:[-–•·▪*]|\d{1,2}[.)\-])\s+/;
const HEADING_LIKE = /^\s*(?:#{1,6}\s|\*[^*\n]+\*\s*:?\s*$)|[:：]\s*\**\s*$/;
const SECTION_LOOKBACK = 25;

/** A heading that introduces what the offer includes («الخدمات المشمولة», "Included"). */
const INCLUDED_HEADING = /(?:مشمول|مشمولة|المشمولات|يشمل|تشمل|شامل|includes?|included|inclusions)/i;

/**
 * The heading of the section whose item holds `index`, or null when the line
 * is not a section item. Items are list lines, or plain lines right under a
 * heading ending in a colon; the heading is the first other line above them.
 */
function sectionHeading(text: string, index: number): string | null {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const lines = text.slice(0, lineStart).split("\n").slice(0, -1).reverse();
  const itemLine = text.slice(lineStart, (text.indexOf("\n", index) + 1 || text.length + 1) - 1);
  const isListItem = LIST_ITEM.test(itemLine);
  for (const line of lines.slice(0, SECTION_LOOKBACK)) {
    if (line.trim() === "") {
      if (isListItem) continue;
      return null;
    }
    if (LIST_ITEM.test(line)) continue;
    if (isListItem || HEADING_LIKE.test(line)) return line;
  }
  return null;
}

/**
 * Whether the line holding `index` is an item of a section headed «غير مشمول»
 * / "Not included" ("### غير مشمول\n- تذاكر الطيران الدولية.").
 */
export function inExcludedSection(text: string, index: number): boolean {
  const heading = sectionHeading(text, index);
  return heading !== null && EXCLUDED_HEADING.test(heading);
}

/**
 * Whether the line holding `index` is an item of a section headed «الخدمات
 * المشمولة» / "Included" ("### الخدمات المشمولة\n- جميع الضرائب.").
 */
export function inIncludedSection(text: string, index: number): boolean {
  const heading = sectionHeading(text, index);
  return heading !== null && !EXCLUDED_HEADING.test(heading) && INCLUDED_HEADING.test(heading);
}

/** The item text (list marker stripped) of the first `mentionRe` match that `inSection` accepts. */
function listedMention(text: string, mentionRe: RegExp, inSection: (text: string, index: number) => boolean): string | null {
  const mentions = new RegExp(mentionRe.source, mentionRe.flags.includes("g") ? mentionRe.flags : mentionRe.flags + "g");
  for (const m of text.matchAll(mentions)) {
    if (m.index !== undefined && inSection(text, m.index)) {
      const start = text.lastIndexOf("\n", m.index - 1) + 1;
      const end = text.indexOf("\n", m.index);
      return text.slice(start, end < 0 ? undefined : end).replace(LIST_ITEM, "").trim();
    }
  }
  return null;
}

/**
 * A bare mention listed under «الخدمات المشمولة» ("- جميع الضرائب."), read as
 * included. Only for rules whose mention cannot itself be optional or paid
 * (taxes, transfers); null when no such item exists.
 */
export function listedAsIncluded(text: string, mentionRe: RegExp): InclusionMatch | null {
  const item = listedMention(text, mentionRe, inIncludedSection);
  if (item === null || NEGATIVE_STATUS.test(item)) return null;
  return { value: true, evidence: item };
}

export function detectInclusion(
  text: string,
  includeRe: RegExp,
  excludeRe: RegExp,
  /** A bare mention ("تذاكر الطيران"), read as excluded inside a «غير مشمول» list. */
  mentionRe?: RegExp
): InclusionMatch | null {
  const ex = excludeRe.exec(text);
  if (ex) return { value: false, evidence: text.slice(ex.index, ex.index + ex[0].length) };

  if (mentionRe) {
    const item = listedMention(text, mentionRe, inExcludedSection);
    if (item !== null) return { value: false, evidence: item };
  }

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
