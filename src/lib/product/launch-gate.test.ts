import { describe, expect, it } from "vitest";
import { PRODUCT_CAPABILITIES, type ProductCapability } from "./capabilities";
import { KNOWN_REGRESSION_GAPS } from "@/lib/offer-pipeline/regression/load-fixtures";
import {
  CURRENT_LAUNCH_EVIDENCE,
  assertPublicLaunchAllowed,
  evaluateLaunchGate,
  type LaunchEvidence,
} from "./launch-gate";

const COMPLETE_EVIDENCE: LaunchEvidence = {
  automatedChecksPassed: true,
  legalDocumentsApproved: true,
  noExpectedFailureFixtures: true,
  feedbackDurableOrHidden: true,
  noDisabledNavigationLinks: true,
  noUnintendedLegacyStageCopy: true,
  noFakeResults: true,
  enabledInputsSecurityReviewed: true,
};

const COMPLETE_CAPABILITIES = Object.values(PRODUCT_CAPABILITIES).reduce(
  (result, capability) => {
    result[capability.key] = capability.requiredForPublicLaunch
      ? ({ ...capability, status: "enabled" } satisfies ProductCapability)
      : capability;
    return result;
  },
  {} as Record<keyof typeof PRODUCT_CAPABILITIES, ProductCapability>
);

describe("public launch gate", () => {
  it("blocks the current prelaunch state and reports concrete blockers", () => {
    const result = evaluateLaunchGate();
    expect(result.ready).toBe(false);
    expect(result.blockers).toContainEqual({
      code: "capability_not_enabled",
      capability: "publicIndexing",
    });
    expect(result.blockers).toContainEqual({ code: "automatedChecksPassed" });
    expect(result.blockers).toContainEqual({ code: "legalDocumentsApproved" });
    expect(result.blockers).toContainEqual({ code: "enabledInputsSecurityReviewed" });
  });

  it("keeps the expected-failure gate synchronized with the regression registry", () => {
    expect(CURRENT_LAUNCH_EVIDENCE.noExpectedFailureFixtures).toBe(
      Object.keys(KNOWN_REGRESSION_GAPS).length === 0
    );
    expect(KNOWN_REGRESSION_GAPS).toEqual({});
  });

  it("cannot be bypassed by evidence while an essential capability is incomplete", () => {
    expect(() => assertPublicLaunchAllowed(COMPLETE_EVIDENCE)).toThrow(
      /capability_not_enabled/
    );
  });

  it("cannot be bypassed by capabilities while release evidence is incomplete", () => {
    expect(() =>
      assertPublicLaunchAllowed(CURRENT_LAUNCH_EVIDENCE, COMPLETE_CAPABILITIES)
    ).toThrow(/automatedChecksPassed/);
  });

  it("allows public only when every capability and evidence gate passes", () => {
    expect(evaluateLaunchGate(COMPLETE_EVIDENCE, COMPLETE_CAPABILITIES)).toEqual({
      ready: true,
      blockers: [],
    });
    expect(() =>
      assertPublicLaunchAllowed(COMPLETE_EVIDENCE, COMPLETE_CAPABILITIES)
    ).not.toThrow();
  });
});
