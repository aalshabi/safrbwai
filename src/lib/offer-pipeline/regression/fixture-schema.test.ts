import { describe, expect, it } from "vitest";
import {
  REGRESSION_CATEGORIES,
  REGRESSION_FIELD_KEYS,
  REGRESSION_LOCALES,
  type RegressionFixture,
} from "./types";
import { KNOWN_REGRESSION_GAPS, loadRegressionFixtures } from "./load-fixtures";

const fixtures = loadRegressionFixtures();

const FIXTURE_FIELDS = [
  "id",
  "locale",
  "category",
  "description",
  "syntheticInput",
  "expectations",
] as const;

const EXPECTATION_FIELDS = [
  "mustConfirm",
  "mustNotConfirm",
  "mustMarkMissing",
  "mustNotMarkMissing",
  "mustDetectContradictions",
  "mustAsk",
  "mustNotAsk",
  "expectedValues",
  "maxSuggestedQuestions",
] as const;

const PERSONAL_DATA_PATTERNS = [
  { label: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: "phone", pattern: /(?:\+\d{1,3}[\s-]?)?\d[\d\s().-]{7,}\d/ },
  { label: "payment-card-like number", pattern: /\b(?:\d[ -]?){13,19}\b/ },
  { label: "private or public URL", pattern: /\b(?:https?:\/\/|www\.)\S+/i },
  { label: "request ID label", pattern: /\brequest\s*[-_ ]?id\b/i },
  {
    label: "UUID-like identifier",
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  },
] as const;

function overlap(left: readonly string[], right: readonly string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function sortedKeys(value: object): string[] {
  return Object.keys(value).sort();
}

describe("closed Beta regression fixture schema", () => {
  it("contains exactly 15 Arabic and 15 English synthetic fixtures", () => {
    expect(fixtures).toHaveLength(30);
    expect(fixtures.filter((fixture) => fixture.locale === "ar")).toHaveLength(15);
    expect(fixtures.filter((fixture) => fixture.locale === "en")).toHaveLength(15);
  });

  it("uses unique IDs and covers every required category", () => {
    const ids = fixtures.map((fixture) => fixture.id);
    expect(new Set(ids).size, "fixture IDs must be unique").toBe(ids.length);

    const categories = new Set(fixtures.map((fixture) => fixture.category));
    for (const category of REGRESSION_CATEGORIES) {
      expect(categories.has(category), `missing regression category: ${category}`).toBe(true);
    }
  });

  it("accepts only known top-level and expectation fields", () => {
    for (const fixture of fixtures) {
      expect(
        sortedKeys(fixture),
        `${fixture.id}: unknown fixture field`
      ).toEqual([...FIXTURE_FIELDS].sort());

      const expectedExpectationFields = fixture.expectations.expectedValues
        ? EXPECTATION_FIELDS
        : EXPECTATION_FIELDS.filter((field) => field !== "expectedValues");
      expect(
        sortedKeys(fixture.expectations),
        `${fixture.id}: unknown expectation field`
      ).toEqual([...expectedExpectationFields].sort());
    }
  });

  it("requires a supported locale and non-empty synthetic input", () => {
    for (const fixture of fixtures) {
      expect(
        REGRESSION_LOCALES.includes(fixture.locale),
        `${fixture.id}: unsupported locale`
      ).toBe(true);
      expect(fixture.syntheticInput.trim().length, `${fixture.id}: empty syntheticInput`).toBeGreaterThan(0);
      expect(fixture.description.trim().length, `${fixture.id}: empty description`).toBeGreaterThan(0);
    }
  });

  it("uses only known field keys and never expects more than five questions", () => {
    const knownKeys = new Set<string>(REGRESSION_FIELD_KEYS);
    for (const fixture of fixtures) {
      const fieldLists = [
        fixture.expectations.mustConfirm,
        fixture.expectations.mustNotConfirm,
        fixture.expectations.mustMarkMissing,
        fixture.expectations.mustNotMarkMissing,
        Object.keys(fixture.expectations.expectedValues ?? {}),
      ];
      for (const key of fieldLists.flat()) {
        expect(knownKeys.has(key), `${fixture.id}: unknown field key ${key}`).toBe(true);
      }
      expect(
        fixture.expectations.maxSuggestedQuestions,
        `${fixture.id}: maxSuggestedQuestions exceeds 5`
      ).toBeLessThanOrEqual(5);
      expect(
        fixture.expectations.mustAsk.length,
        `${fixture.id}: mustAsk contains more than 5 questions`
      ).toBeLessThanOrEqual(5);
    }
  });

  it("has no contradictory positive and negative expectations", () => {
    for (const fixture of fixtures) {
      expect(
        overlap(fixture.expectations.mustConfirm, fixture.expectations.mustNotConfirm),
        `${fixture.id}: key appears in mustConfirm and mustNotConfirm`
      ).toEqual([]);
      expect(
        overlap(fixture.expectations.mustMarkMissing, fixture.expectations.mustNotMarkMissing),
        `${fixture.id}: key appears in mustMarkMissing and mustNotMarkMissing`
      ).toEqual([]);
      expect(
        overlap(fixture.expectations.mustAsk, fixture.expectations.mustNotAsk),
        `${fixture.id}: key appears in mustAsk and mustNotAsk`
      ).toEqual([]);
    }
  });

  it("contains no obvious personal, payment, URL, or request ID patterns", () => {
    for (const fixture of fixtures) {
      for (const { label, pattern } of PERSONAL_DATA_PATTERNS) {
        expect(pattern.test(fixture.syntheticInput), `${fixture.id}: detected ${label}`).toBe(false);
      }
    }
  });

  it("keeps known gaps outside the fixture schema and points to valid expectations", () => {
    const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture] as const));
    for (const [id, expectationNames] of Object.entries(KNOWN_REGRESSION_GAPS)) {
      const fixture = fixtureById.get(id);
      expect(fixture, `known gap references missing fixture: ${id}`).toBeDefined();
      for (const expectationName of expectationNames) {
        expect(
          expectationName in (fixture as RegressionFixture).expectations,
          `${id}: known gap references missing expectation ${expectationName}`
        ).toBe(true);
      }
    }
  });
});
