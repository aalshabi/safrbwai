/**
 * TextExtractor — a pure ORCHESTRATOR. It holds no extraction logic of its own:
 * it runs each independent rule from the RuleRegistry over the raw text and
 * merges their outputs into one `ExtractedOfferFacts` (+ collected warnings).
 * Adding a new source of facts later means adding a rule to the registry, not
 * changing this file.
 *
 * This module performs NO network, disk, OCR, PDF parsing, or persistence.
 */

import type { Bi, ExtractedOfferFacts, RawOfferSource } from "@/lib/offer-pipeline/types";
import type { OfferObservations } from "@/lib/offer-pipeline/analysis/types";
import type { OfferExtractionResult, OfferExtractor } from "../types";
import { createDefaultRuleRegistry, RuleRegistry } from "./rule-registry";

/**
 * Run the rule engine over already-validated offer text. Exposed separately so
 * each layer is testable in isolation. Merging is order-independent: every rule
 * owns a distinct fact key.
 */
export function extractFactsFromText(
  text: string,
  registry: RuleRegistry = createDefaultRuleRegistry()
): { facts: ExtractedOfferFacts; warnings: Bi[]; observations?: OfferObservations } {
  const facts: ExtractedOfferFacts = {};
  const warnings: Bi[] = [];
  const prices: NonNullable<OfferObservations["prices"]> = [];
  const currencies: NonNullable<OfferObservations["currencies"]> = [];
  const nights: NonNullable<OfferObservations["nights"]> = [];
  const priceComponents: NonNullable<OfferObservations["priceComponents"]> = [];

  for (const rule of registry.list()) {
    const result = rule.apply(text);
    Object.assign(facts, result.facts);
    warnings.push(...result.warnings);
    prices.push(...(result.observations?.prices ?? []));
    currencies.push(...(result.observations?.currencies ?? []));
    nights.push(...(result.observations?.nights ?? []));
    priceComponents.push(...(result.observations?.priceComponents ?? []));
  }

  const observations =
    prices.length > 0 || currencies.length > 0 || nights.length > 0
      ? {
          ...(prices.length > 0 ? { prices } : {}),
          ...(currencies.length > 0 ? { currencies } : {}),
          ...(nights.length > 0 ? { nights } : {}),
          ...(priceComponents.length > 0 ? { priceComponents } : {}),
        }
      : undefined;
  return { facts, warnings, observations };
}

/**
 * The text `OfferExtractor`. Returns `empty` for blank text and `unsupported`
 * for a non-text source; otherwise a successful (possibly sparse) extraction.
 *
 * NOTE: this extractor is intentionally NOT yet wired into the source-level
 * registry — that integration (and flipping the source capability) belongs to a
 * later task alongside the pipeline/route. Here it is a fully tested unit.
 */
export function createTextExtractor(registry: RuleRegistry = createDefaultRuleRegistry()) {
  return {
    type: "text",
    enabled: true,
    extract(source: RawOfferSource): OfferExtractionResult {
      if (source.type !== "text") return { ok: false, reason: "unsupported" };
      if (source.text.trim().length === 0) return { ok: false, reason: "empty" };

      const { facts, warnings, observations } = extractFactsFromText(source.text, registry);
      return { ok: true, facts, warnings, observations };
    },
  } satisfies OfferExtractor;
}
