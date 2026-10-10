import { isFeatureEnabled } from "@/lib/product/capabilities";

/**
 * Whether the PDF tab is offered. Production follows the `pdfInput` product
 * capability (still disabled). A Vercel Preview deployment offers it so the
 * activation gates in docs/PDF_INPUT_SPEC.md can be verified there; the PDF is
 * read on the device and only reviewed text is sent, as with pasted text.
 */
export function isPdfInputAvailable(vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV): boolean {
  return isFeatureEnabled("pdfInput") || vercelEnv === "preview";
}
