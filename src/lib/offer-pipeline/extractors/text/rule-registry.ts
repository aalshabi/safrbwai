/**
 * RuleRegistry — the ordered collection of extraction rules the TextExtractor
 * runs. New rules are added here (or via `register`) WITHOUT touching the
 * extractor itself, which stays a pure orchestrator. This mirrors, one level
 * down, the source-level extractor registry.
 */

import type { ExtractionRule } from "./rule";
import { priceRule } from "./rules/price-rule";
import { currencyRule } from "./rules/currency-rule";
import { nightsRule } from "./rules/nights-rule";
import { travellersRule } from "./rules/travellers-rule";
import { boardRule } from "./rules/board-rule";
import { baggageRule } from "./rules/baggage-rule";
import { insuranceRule } from "./rules/insurance-rule";
import { visaRule } from "./rules/visa-rule";
import { transfersRule } from "./rules/transfers-rule";
import { flightRule } from "./rules/flight-rule";
import { taxesRule } from "./rules/taxes-rule";
import { cancellationRule } from "./rules/cancellation-rule";
import { accommodationRule } from "./rules/accommodation-rule";
import { destinationRule } from "./rules/destination-rule";

export class RuleRegistry {
  private readonly rules: ExtractionRule[] = [];

  register(rule: ExtractionRule): this {
    this.rules.push(rule);
    return this;
  }

  list(): readonly ExtractionRule[] {
    return this.rules;
  }
}

/** The default registry wired with every built-in rule. */
export function createDefaultRuleRegistry(): RuleRegistry {
  return new RuleRegistry()
    .register(priceRule)
    .register(currencyRule)
    .register(nightsRule)
    .register(travellersRule)
    .register(boardRule)
    .register(baggageRule)
    .register(insuranceRule)
    .register(visaRule)
    .register(transfersRule)
    .register(flightRule)
    .register(taxesRule)
    .register(cancellationRule)
    .register(accommodationRule)
    .register(destinationRule);
}
