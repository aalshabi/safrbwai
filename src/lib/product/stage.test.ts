import { describe, expect, it } from "vitest";
import { PRODUCT_CAPABILITIES, type ProductCapability } from "./capabilities";
import { CURRENT_LAUNCH_EVIDENCE, type LaunchEvidence } from "./launch-gate";
import {
  getProductStage,
  isFeatureEnabled,
  isPublicLaunch,
  resolveProductStage,
} from "./stage";

describe("product stage", () => {
  it("is configured as public now that the launch gate passes", () => {
    expect(getProductStage()).toBe("public");
    expect(isPublicLaunch()).toBe(true);
  });

  it("resolves non-public stages without weakening the public gate", () => {
    expect(resolveProductStage("closed_beta")).toBe("closed_beta");
    expect(resolveProductStage("prelaunch")).toBe("prelaunch");
    expect(() =>
      resolveProductStage("public", { ...CURRENT_LAUNCH_EVIDENCE, legalDocumentsApproved: false })
    ).toThrow(/Public launch blocked/);
  });

  it("exposes feature status through the central helper", () => {
    expect(isFeatureEnabled("textOfferAnalysis")).toBe(true);
    expect(isFeatureEnabled("feedback")).toBe(false);
  });

  it("resolves public only with complete reviewed readiness", async () => {
    const completeEvidence: LaunchEvidence = {
      automatedChecksPassed: true,
      legalDocumentsApproved: true,
      noExpectedFailureFixtures: true,
      feedbackDurableOrHidden: true,
      noDisabledNavigationLinks: true,
      noUnintendedLegacyStageCopy: true,
      noFakeResults: true,
      enabledInputsSecurityReviewed: true,
    };
    const capabilities = Object.values(PRODUCT_CAPABILITIES).reduce(
      (result, capability) => {
        result[capability.key] = capability.requiredForPublicLaunch
          ? ({ ...capability, status: "enabled" } satisfies ProductCapability)
          : capability;
        return result;
      },
      {} as Record<keyof typeof PRODUCT_CAPABILITIES, ProductCapability>
    );
    const { assertPublicLaunchAllowed } = await import("./launch-gate");

    expect(() => assertPublicLaunchAllowed(completeEvidence, capabilities)).not.toThrow();
  });
});
