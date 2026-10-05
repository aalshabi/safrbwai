/**
 * BoardRule — extracts the meal/board plan as a canonical code
 * (RO/BB/HB/FB/AI). Only explicit board signals are accepted. If two different
 * board plans are signalled, the result is ambiguous → no fact + a warning.
 */

import type { ExtractionRule, RuleResult } from "../rule";
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
    re: /bed\s*(?:and|&|\+)?\s*breakfast|(?:شامل[ةه]?|يشمل|تشمل)\s*(?:الضرائب(?:\s+والرسوم)?|الرسوم)?\s*(?:،?\s*و)?\s*(?:ال)?إفطار|includ(?:es?|ing)\s+(?:(?:all\s+)?(?:taxes(?:\s+and\s+fees)?|fees)\s*(?:,\s*|\s+(?:and|&)\s+))?breakfast|with\s+breakfast|مع\s*(?:ال)?إفطار|(?:ال)?إفطار\s*فقط|\bBB\b/i,
  },
  { code: "RO", re: /room\s*only|بدون\s*وجبات|بدون\s*إفطار|\bRO\b/i },
];

export const boardRule: ExtractionRule = {
  key: "board",
  apply(text: string): RuleResult {
    const found: { code: string; evidence: string; index: number }[] = [];
    for (const { code, re } of BOARD_SIGNALS) {
      const m = re.exec(text);
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
