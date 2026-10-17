import { isFeatureEnabled } from "@/lib/product/capabilities";
import type { TravelOfferInputType } from "./types";

/**
 * Whether an input tab is offered. Text is always available; PDF and image
 * follow their product capabilities (both read on the device, with only the
 * reviewed text sent, as with pasted text); a link's public page is read by
 * the server and its text reviewed the same way. Each follows its product
 * capability; a Vercel Preview deployment also offers them for verification.
 */
export function isOfferInputAvailable(
  type: TravelOfferInputType,
  vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
): boolean {
  if (type === "text") return true;
  if (type === "pdf") return isFeatureEnabled("pdfInput") || vercelEnv === "preview";
  if (type === "image") return isFeatureEnabled("imageInput") || vercelEnv === "preview";
  return isFeatureEnabled("urlInput") || vercelEnv === "preview";
}

/** @deprecated Use isOfferInputAvailable("pdf"). */
export function isPdfInputAvailable(vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV): boolean {
  return isOfferInputAvailable("pdf", vercelEnv);
}
