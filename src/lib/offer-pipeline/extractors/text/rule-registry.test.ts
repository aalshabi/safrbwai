import { describe, it, expect } from "vitest";
import { RuleRegistry, createDefaultRuleRegistry } from "./rule-registry";
import type { ExtractionRule } from "./rule";

describe("RuleRegistry", () => {
  it("registers all built-in rules with their expected keys", () => {
    const keys = createDefaultRuleRegistry()
      .list()
      .map((r) => r.key);
    expect(keys).toEqual([
      "price",
      "currency",
      "nights",
      "travelers",
      "board",
      "baggage",
      "insurance",
      "visa",
      "transfer",
      "flight",
      "taxes",
      "cancellationPolicy",
      "accommodation",
      "destination",
    ]);
  });

  it("allows adding a new rule without touching existing ones", () => {
    const custom: ExtractionRule = { key: "custom", apply: () => ({ facts: {}, warnings: [] }) };
    const registry = new RuleRegistry().register(custom);
    expect(registry.list().map((r) => r.key)).toEqual(["custom"]);
  });
});
