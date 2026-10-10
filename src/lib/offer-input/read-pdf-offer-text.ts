/**
 * Reads a PDF's offer text on the user's device (docs/PDF_INPUT_SPEC.md):
 * the bytes go to a dedicated worker, never over the network. The worker is
 * terminated after a time limit, so a slow or hostile file ends in a refusal
 * instead of a frozen page.
 */

import type { PdfTextRefusal, PdfTextResult } from "./pdf-text";
import { PDF_TEXT_RESULT_TAG } from "./pdf-text-protocol";

export const PDF_READ_TIMEOUT_MS = 10_000;

const REFUSALS: ReadonlySet<PdfTextRefusal> = new Set(["too_many_pages", "encrypted", "no_text", "too_long", "failed"]);

function isPdfTextResult(value: unknown): value is PdfTextResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  if (result.ok === true) return typeof result.text === "string" && typeof result.pages === "number";
  return result.ok === false && REFUSALS.has(result.reason as PdfTextRefusal);
}

export async function readPdfOfferText(file: File, timeoutMs = PDF_READ_TIMEOUT_MS): Promise<PdfTextResult> {
  if (typeof Worker === "undefined") return { ok: false, reason: "failed" };

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return { ok: false, reason: "failed" };
  }

  return new Promise((resolve) => {
    // The bundler emits the worker as a classic script; its dynamic import of
    // the PDF library is loaded as a separate chunk inside the worker.
    const worker = new Worker(new URL("./pdf-text.worker.ts", import.meta.url));
    const finish = (result: PdfTextResult) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = window.setTimeout(() => finish({ ok: false, reason: "failed" }), timeoutMs);
    worker.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as { tag?: unknown; result?: unknown } | null;
      // pdf.js posts its own handshake on this channel; only our tagged
      // result ends the read.
      if (typeof message !== "object" || message === null || message.tag !== PDF_TEXT_RESULT_TAG) return;
      finish(isPdfTextResult(message.result) ? message.result : { ok: false, reason: "failed" });
    };
    worker.onerror = () => finish({ ok: false, reason: "failed" });
    worker.postMessage(buffer, [buffer]);
  });
}
