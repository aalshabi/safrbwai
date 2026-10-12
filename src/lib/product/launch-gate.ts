import {
  PRODUCT_CAPABILITIES,
  getRequiredLaunchCapabilities,
  type ProductCapability,
  type ProductCapabilityKey,
} from "./capabilities";

export type LaunchEvidence = Readonly<{
  automatedChecksPassed: boolean;
  legalDocumentsApproved: boolean;
  noExpectedFailureFixtures: boolean;
  feedbackDurableOrHidden: boolean;
  noDisabledNavigationLinks: boolean;
  noUnintendedLegacyStageCopy: boolean;
  noFakeResults: boolean;
  enabledInputsSecurityReviewed: boolean;
}>;

export type LaunchBlocker =
  | { code: "capability_not_enabled"; capability: ProductCapabilityKey }
  | { code: keyof LaunchEvidence };

export type LaunchGateResult = Readonly<{
  ready: boolean;
  blockers: readonly LaunchBlocker[];
}>;

/** Evidence for each item is recorded in docs/PUBLIC_LAUNCH.md. */
export const CURRENT_LAUNCH_EVIDENCE: LaunchEvidence = Object.freeze({
  automatedChecksPassed: true,
  legalDocumentsApproved: true,
  noExpectedFailureFixtures: true,
  feedbackDurableOrHidden: true,
  noDisabledNavigationLinks: true,
  noUnintendedLegacyStageCopy: true,
  noFakeResults: true,
  enabledInputsSecurityReviewed: true,
});

const EVIDENCE_KEYS = Object.freeze([
  "automatedChecksPassed",
  "legalDocumentsApproved",
  "noExpectedFailureFixtures",
  "feedbackDurableOrHidden",
  "noDisabledNavigationLinks",
  "noUnintendedLegacyStageCopy",
  "noFakeResults",
  "enabledInputsSecurityReviewed",
] as const satisfies readonly (keyof LaunchEvidence)[]);

export function evaluateLaunchGate(
  evidence: LaunchEvidence = CURRENT_LAUNCH_EVIDENCE,
  capabilities: Readonly<Record<ProductCapabilityKey, ProductCapability>> = PRODUCT_CAPABILITIES
): LaunchGateResult {
  const blockers: LaunchBlocker[] = [];

  for (const capability of getRequiredLaunchCapabilities()) {
    if (capabilities[capability.key].status !== "enabled") {
      blockers.push({ code: "capability_not_enabled", capability: capability.key });
    }
  }

  for (const key of EVIDENCE_KEYS) {
    if (!evidence[key]) {
      blockers.push({ code: key });
    }
  }

  return Object.freeze({ ready: blockers.length === 0, blockers: Object.freeze(blockers) });
}

export function assertPublicLaunchAllowed(
  evidence: LaunchEvidence = CURRENT_LAUNCH_EVIDENCE,
  capabilities: Readonly<Record<ProductCapabilityKey, ProductCapability>> = PRODUCT_CAPABILITIES
): void {
  const result = evaluateLaunchGate(evidence, capabilities);
  if (!result.ready) {
    const codes = result.blockers.map((blocker) =>
      blocker.code === "capability_not_enabled"
        ? `${blocker.code}:${blocker.capability}`
        : blocker.code
    );
    throw new Error(`Public launch blocked: ${codes.join(", ")}`);
  }
}
