/**
 * RoomTypeRule — extracts only an explicitly stated room or suite type.
 * Room counts ("one room", "غرفة واحدة") are deliberately ignored because
 * they describe quantity, not the booked room category.
 */

import type { ExtractionRule, RuleResult } from "../rule";
import { exact } from "../utils";

const PATTERNS = [
  /(?:نوع\s+الغرفة\s*[:：]?\s*)?(?:غرفة|جناح)\s+(?:ديلوكس|ديلوكس\s+تنفيذي(?:ة)?|قياسية|سوبيريور|تنفيذي(?:ة)?|مزدوجة|فردية|ثلاثية|توأم|عائلية|ملكية)/i,
  /(?:نوع\s+الغرفة\s*[:：]\s*)(?:ديلوكس|قياسية|سوبيريور|تنفيذية|مزدوجة|فردية|ثلاثية|توأم|عائلية|جناح(?:\s+تنفيذي)?)/i,
  /(?:room\s+type\s*[:：]?\s*)?(?:standard|superior|deluxe|executive|family|single|double|twin|triple|king|queen)\s+(?:room|suite)/i,
  /room\s+type\s*[:：]\s*(?:standard|superior|deluxe|executive|family|single|double|twin|triple|king|queen)/i,
];

export const roomTypeRule: ExtractionRule = {
  key: "roomType",
  apply(text: string): RuleResult {
    for (const pattern of PATTERNS) {
      const match = pattern.exec(text);
      if (!match) continue;
      const evidence = match[0].trim();
      if (evidence) {
        return { facts: { roomType: exact(evidence, evidence) }, warnings: [] };
      }
    }

    return { facts: {}, warnings: [] };
  },
};
