/**
 * Browser side of link reading: asks the server (POST /api/offer/read-url) to
 * read the public page, then hands the text back for review. Only the URL is
 * sent; the analysis itself still receives reviewed text only.
 */

import type { LinkSignal } from "./url/link-check";

export const URL_READ_TIMEOUT_MS = 20_000;

export type UrlTextResult =
  | { ok: true; text: string; finalUrl: string; signals: LinkSignal[] }
  | { ok: false; reason: string; signals: LinkSignal[] };

function isSignals(value: unknown): value is LinkSignal[] {
  return Array.isArray(value) && value.every((s) => typeof s === "object" && s !== null && typeof (s as LinkSignal).code === "string");
}

export async function readUrlOfferText(
  url: string,
  { signal, timeoutMs = URL_READ_TIMEOUT_MS, fetchImpl = fetch }: { signal?: AbortSignal; timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<UrlTextResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetchImpl("/api/offer/read-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (res.status === 429) return { ok: false, reason: "rate_limited", signals: [] };
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const signals = isSignals(body?.signals) ? body.signals : [];
    if (body?.ok === true && typeof body.text === "string" && typeof body.finalUrl === "string") {
      return { ok: true, text: body.text, finalUrl: body.finalUrl, signals };
    }
    return { ok: false, reason: typeof body?.reason === "string" ? body.reason : "failed", signals };
  } catch {
    return { ok: false, reason: controller.signal.aborted && !signal?.aborted ? "timeout" : "failed", signals: [] };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
