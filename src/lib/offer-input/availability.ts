import { isFeatureEnabled } from "@/lib/product/capabilities";
import type { TravelOfferInputType } from "./types";

/**
 * Whether an input tab is offered. Text is always available; PDF and image
 * follow their product capabilities (both read on the device, with only the
 * reviewed text sent, as with pasted text). A Vercel Preview deployment also
 * offers them, so changes can be verified there. Links stay unavailable.
 */
export function isOfferInputAvailable(
  type: TravelOfferInputType,
  vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
): boolean {
  if (type === "text") return true;
  if (type === "pdf") return isFeatureEnabled("pdfInput") || vercelEnv === "preview";
  if (type === "image") return isFeatureEnabled("imageInput") || vercelEnv === "preview";
  return false;
}

/** @deprecated Use isOfferInputAvailable("pdf"). */
export function isPdfInputAvailable(vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV): boolean {
  return isOfferInputAvailable("pdf", vercelEnv);
}
