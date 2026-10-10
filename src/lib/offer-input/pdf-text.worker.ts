/**
 * Runs PDF text extraction off the main thread, so a large or hostile file
 * cannot freeze the page; the caller terminates this worker on a time limit.
 * Receives the file's bytes, posts back a tagged `PdfTextResult`. Nothing
 * leaves the device.
 *
 * pdf.js, once loaded inside a worker, also announces itself on this channel
 * (`{ sourceName: "worker", action: "ready" }`), so the result is tagged and the
 * caller ignores every other message.
 */

import { extractOfferTextFromPdf } from "./pdf-text";
import { PDF_TEXT_RESULT_TAG } from "./pdf-text-protocol";

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = async (event) => {
  if (!(event.data instanceof ArrayBuffer)) return;
  const { getDocumentProxy } = await import("unpdf");
  // The bundled pdf.js has no eval/new Function code path (the old
  // `isEvalSupported` switch no longer exists), and text extraction never runs
  // PDF scripts.
  const result = await extractOfferTextFromPdf(new Uint8Array(event.data), (data) => getDocumentProxy(data));
  scope.postMessage({ tag: PDF_TEXT_RESULT_TAG, result });
};
