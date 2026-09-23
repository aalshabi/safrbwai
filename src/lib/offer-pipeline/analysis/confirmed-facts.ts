/**
 * Build the list of confirmed facts — only facts that are actually present and
 * carry evidence are included. A fact without evidence is never surfaced.
 */

import type { ExtractedOfferFacts, Fact } from "@/lib/offer-pipeline/types";
import type { Bi } from "@/lib/offer-pipeline/types";
import type { ConfirmedFact } from "./types";
import { FIELDS } from "./required-fields";

function labelFor(key: string): Bi {
  return FIELDS.find((f) => f.key === key)?.label ?? { ar: key, en: key };
}

export function buildConfirmedFacts(facts: ExtractedOfferFacts): ConfirmedFact[] {
  const out: ConfirmedFact[] = [];

  /**
   * `label` is passed only for a fact with no entry in the field registry —
   * flight is extracted and shown, but is neither required nor recommended of
   * every offer, so it deliberately stays out of the checklist and the
   * missing-fields list.
   */
  const add = (key: string, fact: Fact<unknown> | undefined, label?: Bi) => {
    if (!fact || !fact.evidence) return; // never surface a fact without evidence
    out.push({
      key,
      label: label ?? labelFor(key),
      value: fact.value,
      evidence: fact.evidence,
      confidenceType: "exact",
    });
  };

  add("totalPrice", facts.price);
  add("currency", facts.currency);
  add("nights", facts.nights);
  add("destination", facts.destination);
  add("travellers", facts.travelers);
  add("accommodation", facts.accommodation);
  add("board", facts.board);
  add("baggage", facts.baggage);
  add("flight", facts.flight, { ar: "الطيران", en: "Flight" });
  add("transfers", facts.transfer);
  add("taxes", facts.taxes);
  add("cancellationPolicy", facts.cancellationPolicy);
  add("insurance", facts.insurance);
  add("visa", facts.visa);

  return out;
}
