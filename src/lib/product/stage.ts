import { isFeatureEnabled as capabilityIsEnabled, type ProductCapabilityKey } from "./capabilities";
import {
  assertPublicLaunchAllowed,
  CURRENT_LAUNCH_EVIDENCE,
  type LaunchEvidence,
} from "./launch-gate";

export type ProductStage = "closed_beta" | "prelaunch" | "public";

const CONFIGURED_PRODUCT_STAGE: ProductStage = "public";

export function resolveProductStage(
  requestedStage: ProductStage,
  evidence: LaunchEvidence = CURRENT_LAUNCH_EVIDENCE
): ProductStage {
  if (requestedStage === "public") {
    assertPublicLaunchAllowed(evidence);
  }
  return requestedStage;
}

const PRODUCT_STAGE = resolveProductStage(CONFIGURED_PRODUCT_STAGE);

export function getProductStage(): ProductStage {
  return PRODUCT_STAGE;
}

export function isPublicLaunch(): boolean {
  return getProductStage() === "public";
}

export function isFeatureEnabled(feature: ProductCapabilityKey): boolean {
  return capabilityIsEnabled(feature);
}
