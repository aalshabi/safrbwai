/**
 * BoardRule — extracts the meal/board plan as a canonical code
 * (RO/BB/HB/FB/AI). Only explicit board signals are accepted. If two different
 * board plans are signalled, the result is ambiguous → no fact + a warning.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { inExcludedSection } from "../signals";
import { exact } from "../utils";

interface BoardSignal {
  code: string;
  re: RegExp;
}

// Order does not imply priority; every signal is tested and conflicts are flagged.
const BOARD_SIGNALS: BoardSignal[] = [
  { code: "AI", re: /all[-\s]?inclusive|(?:شامل|الكل)\s*(?:كلي|شامل)|الكل\s*شامل/i },
  { code: "FB", re: /full[-\s]?board|إقامة\s*كاملة|جميع\s*الوجبات|ثلاث\s*وجبات|\bFB\b/i },
  { code: "HB", re: /half[-\s]?board|نصف\s*إقامة|إفطار\s*و?عشاء|\bHB\b/i },
  {
    code: "BB",
    re: /bed\s*(?:and|&|\+)?\s*breakfast|(?:ال)?إفطار\s*(?:ال)?(?:بوفيه|يومي)|(?:شامل[ةه]?|يشمل|تشمل)\s*(?:الضرائب(?:\s+والرسوم)?|الرسوم)?\s*(?:،?\s*و)?\s*(?:ال)?إفطار|includ(?:es?|ing)\s+(?:(?:all\s+)?(?:taxes(?:\s+and\s+fees)?|fees)\s*(?:,\s*|\s+(?:and|&)\s+))?breakfast|with\s+breakfast|مع\s*(?:ال)?إفطار|(?:ال)?إفطار\s*فقط|\bBB\b/i,
  },
  { code: "RO", re: /room\s*only|بدون\s*وجبات|بدون\s*إفطار|\bRO\b/i },
];

const UPGRADE_FROM = /(?:ترقية|upgrade)[^\n.]{0,40}?(?:من|from)\s*([^\n.]{1,40}?)\s*(?:إلى|الى|to)\s/giu;

/** An exclusion opening the clause a signal sits in ("غير مشمول: إفطار بوفيه"). */
const EXCLUDED_PREFIX =
  /(?:غير\s*(?:مشمول|مشمولة|شامل|شاملة)|لا\s*(?:يشمل|تشمل)|not\s+included|excluding|excludes?)[^.،,;؛\n]*$|(?:^|\s)(?:غير|لا|not)\s+$/i;

/** An exclusion closing the clause right after a signal ("إفطار بوفيه غير مشمول"). */
const EXCLUDED_SUFFIX = /^[^.،,;؛\n]{0,25}?(?:غير\s*(?:مشمول|مشمولة|شامل|شاملة)|not\s+included|excluded)/i;

/** Wording that sells a meal plan as an optional or paid extra. */
const OPTIONAL_WORD =
  "اختياري|رسوم\\s*إضافية|بتكلفة\\s*إضافية|مقابل\\s*(?:رسوم|مبلغ)|عند\\s*الطلب|optional|additional\\s*(?:charge|cost|fee)|extra\\s*(?:charge|cost|fee)|on\\s*request";
/** After the signal in its clause ("إفطار بوفيه اختياري مقابل رسوم إضافية"). */
const OPTIONAL_EXTRA = new RegExp(`^[^.،,;؛\\n]{0,40}?(?:${OPTIONAL_WORD})`, "i");
/** Before the signal in its clause ("Optional bed and breakfast", "اختياري: إفطار بوفيه"). */
const OPTIONAL_PREFIX = new RegExp(`(?:${OPTIONAL_WORD})[^.،,;؛\\n]*$`, "i");

/** The first match of `re` that the offer does not state as excluded. */
function firstIncluded(text: string, scanned: string, re: RegExp): RegExpExecArray | null {
  const all = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of scanned.matchAll(all)) {
    const lineStart = text.lastIndexOf("\n", m.index - 1) + 1;
    if (EXCLUDED_PREFIX.test(text.slice(lineStart, m.index))) continue;
    if (EXCLUDED_SUFFIX.test(text.slice(m.index + m[0].length))) continue;
    if (OPTIONAL_EXTRA.test(text.slice(m.index + m[0].length))) continue;
    if (OPTIONAL_PREFIX.test(text.slice(lineStart, m.index))) continue;
    if (inExcludedSection(text, m.index)) continue;
    return m as RegExpExecArray;
  }
  return null;
}

export const boardRule: ExtractionRule = {
  key: "board",
  apply(text: string): RuleResult {
    const found: { code: string; evidence: string; index: number }[] = [];
    // An upgrade names the plan the traveller no longer gets: in «ترقية مجانية
    // من نصف إقامة HB إلى إقامة كاملة FB» only FB is the offer's board.
    const scanned = text.replace(UPGRADE_FROM, (match, from: string) =>
      match.replace(from, " ".repeat(from.length))
    );
    for (const { code, re } of BOARD_SIGNALS) {
      const m = firstIncluded(text, scanned, re);
      if (m) found.push({ code, evidence: text.slice(m.index, m.index + m[0].length), index: m.index });
    }

    if (found.length === 0) return { facts: {}, warnings: [] };

    const codes = new Set(found.map((f) => f.code));
    if (codes.size > 1) {
      return {
        facts: {},
        warnings: [
          {
            ar: "ذُكر أكثر من نوع إقامة، فلم يُستخرج نوع مؤكد.",
            en: "More than one board type was signalled; none extracted with confidence.",
          },
        ],
      };
    }

    const first = found.sort((a, b) => a.index - b.index)[0];
    return { facts: { board: exact(first.code, first.evidence) }, warnings: [] };
  },
};
