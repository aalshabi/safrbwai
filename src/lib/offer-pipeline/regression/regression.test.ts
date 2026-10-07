import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtractedOfferFacts } from "@/lib/offer-pipeline/types";
import { runOfferPipeline, type PipelineOutcome } from "@/lib/offer-pipeline/pipeline";
import type { RegressionFieldKey, RegressionFixture } from "./types";
import { KNOWN_REGRESSION_GAPS, loadRegressionFixtures } from "./load-fixtures";

const fixtures = loadRegressionFixtures();
const priorityWeight = { high: 0, medium: 1, low: 2 } as const;

function failure(fixture: RegressionFixture, expectation: string, detail: string): string {
  return `[${fixture.id}] [${fixture.category}] ${expectation}: ${detail}`;
}

function valueFor(key: RegressionFieldKey, facts: ExtractedOfferFacts): unknown {
  switch (key) {
    case "totalPrice":
      return facts.totalPrice?.value;
    case "perPersonPrice":
      return facts.perPersonPrice?.value;
    case "perNightPrice":
      return facts.perNightPrice?.value;
    case "statedPrice":
      return facts.statedPrice?.value;
    case "currency":
      return (
        facts.currency?.value ??
        facts.totalPrice?.value.currency ??
        facts.perPersonPrice?.value.currency ??
        facts.perNightPrice?.value.currency ??
        facts.statedPrice?.value.currency
      );
    case "nights":
      return facts.nights?.value;
    case "destination":
      return facts.destination?.value;
    case "travellers":
      return facts.travelers?.value;
    case "accommodation":
      return facts.accommodation?.value;
    case "roomType":
      return facts.roomType?.value;
    case "board":
      return facts.board?.value;
    case "baggage":
      return facts.baggage?.value;
    case "transfers":
      return facts.transfer?.value;
    case "taxes":
      return facts.taxes?.value;
    case "cancellationPolicy":
      return facts.cancellationPolicy?.value;
    case "visa":
      return facts.visa?.value;
    case "insurance":
      return facts.insurance?.value;
    case "flight":
      return facts.flight?.value;
    case "transitDuration":
      return facts.transitDuration?.value;
    case "stopCount":
      return facts.stopCount?.value;
    case "airportChange":
      return facts.airportChange?.value;
    case "travelDates":
      return undefined;
  }
}

function assertNoScore(value: unknown, fixture: RegressionFixture, path = "outcome"): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    expect(key.toLowerCase(), failure(fixture, "no score", `unexpected key at ${path}.${key}`)).not.toBe(
      "score"
    );
    assertNoScore(child, fixture, `${path}.${key}`);
  }
}

function assertFixture(
  fixture: RegressionFixture,
  outcome: Extract<PipelineOutcome, { status: "ok" }>
): void {
  const { analysis, extraction } = outcome;
  const confirmed = new Set(analysis.confirmedFacts.map((fact) => fact.key));
  const missing = new Set(analysis.missingFields.map((field) => field.key));
  const questions = analysis.suggestedQuestions.map((question) => question.key);
  const contradictions = analysis.contradictions.map((contradiction) => contradiction.code);

  for (const key of fixture.expectations.mustConfirm) {
    expect(confirmed.has(key), failure(fixture, "mustConfirm", `missing confirmed fact ${key}`)).toBe(true);
  }
  for (const key of fixture.expectations.mustNotConfirm) {
    expect(confirmed.has(key), failure(fixture, "mustNotConfirm", `unexpected confirmed fact ${key}`)).toBe(false);
  }
  for (const key of fixture.expectations.mustMarkMissing) {
    expect(missing.has(key), failure(fixture, "mustMarkMissing", `missing missing-field ${key}`)).toBe(true);
  }
  for (const key of fixture.expectations.mustNotMarkMissing) {
    expect(missing.has(key), failure(fixture, "mustNotMarkMissing", `unexpected missing-field ${key}`)).toBe(false);
  }

  if (!(fixture.id in KNOWN_REGRESSION_GAPS)) {
    if (fixture.expectations.mustDetectContradictions.length === 0) {
      expect(
        contradictions,
        failure(fixture, "mustDetectContradictions", "unexpected contradiction")
      ).toEqual([]);
    } else {
      for (const code of fixture.expectations.mustDetectContradictions) {
        expect(
          contradictions.includes(code),
          failure(fixture, "mustDetectContradictions", `missing ${code}`)
        ).toBe(true);
      }
    }
  }

  let lastQuestionIndex = -1;
  for (const key of fixture.expectations.mustAsk) {
    const index = questions.indexOf(key);
    expect(index, failure(fixture, "mustAsk", `missing question ${key}`)).toBeGreaterThan(-1);
    expect(
      index,
      failure(fixture, "question order", `${key} appeared before an earlier expected question`)
    ).toBeGreaterThan(lastQuestionIndex);
    lastQuestionIndex = index;
  }
  for (const key of fixture.expectations.mustNotAsk) {
    expect(questions.includes(key), failure(fixture, "mustNotAsk", `unexpected question ${key}`)).toBe(false);
  }

  expect(
    analysis.suggestedQuestions.length,
    failure(fixture, "maxSuggestedQuestions", "question cap exceeded")
  ).toBeLessThanOrEqual(fixture.expectations.maxSuggestedQuestions);

  const weights = analysis.suggestedQuestions.map((question) => priorityWeight[question.priority]);
  expect(
    weights,
    failure(fixture, "question order", "priority order changed")
  ).toEqual([...weights].sort((left, right) => left - right));

  for (const [key, expected] of Object.entries(fixture.expectations.expectedValues ?? {})) {
    expect(
      valueFor(key as RegressionFieldKey, extraction.facts),
      failure(fixture, "expectedValues", `wrong value for ${key}`)
    ).toEqual(expected);
  }

  for (const fact of analysis.confirmedFacts) {
    expect(
      fact.confidenceType,
      failure(fixture, "confirmedFacts", `${fact.key} was not exact`)
    ).toBe("exact");
    const evidenceParts = fact.evidence
      .split(/\s*(?:;|\|)\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    expect(
      evidenceParts.every((part) => fixture.syntheticInput.includes(part)),
      failure(fixture, "confirmedFacts", `${fact.key} evidence is not sourced from the input`)
    ).toBe(true);
    expect(
      missing.has(fact.key),
      failure(fixture, "missingFields", `${fact.key} is both confirmed and missing`)
    ).toBe(false);
  }

  assertNoScore(outcome, fixture);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("closed Beta synthetic regression fixtures", () => {
  for (const fixture of fixtures) {
    it(`${fixture.id} — ${fixture.category} — ${fixture.description}`, async () => {
      const fetchSpy = vi.fn(() => {
        throw new Error("Regression pipeline attempted an external request");
      });
      vi.stubGlobal("fetch", fetchSpy);

      const first = await runOfferPipeline({ type: "text", text: fixture.syntheticInput });
      expect(first.status, failure(fixture, "pipeline", "text did not produce analysis")).toBe("ok");
      if (first.status !== "ok") return;

      const second = await runOfferPipeline({ type: "text", text: fixture.syntheticInput });
      expect(second, failure(fixture, "determinism", "same input produced a different result")).toEqual(first);
      expect(fetchSpy, failure(fixture, "external service", "fetch was called")).not.toHaveBeenCalled();

      assertFixture(fixture, first);
    });
  }

  for (const [fixtureId] of Object.entries(KNOWN_REGRESSION_GAPS)) {
    it.fails(`[known gap] ${fixtureId} detects its documented contradiction`, async () => {
      const fixture = fixtures.find((candidate) => candidate.id === fixtureId);
      expect(fixture, `missing known-gap fixture ${fixtureId}`).toBeDefined();
      if (!fixture) return;

      const outcome = await runOfferPipeline({ type: "text", text: fixture.syntheticInput });
      expect(outcome.status, failure(fixture, "pipeline", "text did not produce analysis")).toBe("ok");
      if (outcome.status !== "ok") return;

      const contradictionCodes = outcome.analysis.contradictions.map((contradiction) => contradiction.code);
      for (const code of fixture.expectations.mustDetectContradictions) {
        expect(
          contradictionCodes.includes(code),
          failure(fixture, "mustDetectContradictions", `missing ${code}`)
        ).toBe(true);
      }
    });
  }

  it("keeps the pipeline free of network, LLM, persistence, OCR, and PDF integrations", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/offer-pipeline/pipeline.ts"),
      "utf8"
    );
    const imports = source
      .split(/\r?\n/)
      .filter((line) => line.trimStart().startsWith("import "))
      .join("\n")
      .toLowerCase();
    for (const forbidden of ["openai", "anthropic", "llm", "prisma", "supabase", "ocr", "pdf"]) {
      expect(imports, `pipeline imports forbidden integration marker: ${forbidden}`).not.toContain(forbidden);
    }
    expect(source, "pipeline performs a network request").not.toMatch(/\bfetch\s*\(/);
  });
});
