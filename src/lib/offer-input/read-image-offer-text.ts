/**
 * Reads an offer image's text on the user's device (docs/IMAGE_INPUT_SPEC.md).
 * The OCR engine (tesseract.js) runs in its own worker and loads its code and
 * Arabic/English models from this site (/ocr, see scripts/copy-ocr-assets.mjs),
 * never from a CDN. The image is never uploaded. The worker is terminated after
 * a time limit, so a slow or hostile image ends in a refusal instead of a
 * frozen page.
 */

import { checkImageDimensions, ocrScale, readImageHeaderSize, type ImageTextResult } from "./image-text";
import { OCR_LANGS, OCR_OEM_LSTM_ONLY, readOfferWithEngine, type OcrEngine } from "./ocr-passes";

/** Includes the first-use download of the models (about 7–8 MB). */
export const IMAGE_READ_TIMEOUT_MS = 90_000;
export const OCR_ASSET_BASE = "/ocr";

export type ImageReadProgress = { stage: "loading" | "recognizing"; ratio: number };

type OcrWorker = OcrEngine & { terminate(): Promise<unknown> };

async function drawScaled(file: File): Promise<HTMLCanvasElement | ImageTextResult> {
  // Refuse an oversized image from its header, before decoding allocates it.
  // If the header cannot be read, the check after decoding still applies.
  let header: { width: number; height: number } | null = null;
  try {
    header = readImageHeaderSize(new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()));
  } catch {
    header = null;
  }
  const headerRefusal = header && checkImageDimensions(header.width, header.height);
  if (headerRefusal === "too_large") return { ok: false, reason: headerRefusal };
  let bitmap: ImageBitmap;
  try {
    // Decoding applies the photo's EXIF orientation.
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, reason: "failed" };
  }
  try {
    const refusal = checkImageDimensions(bitmap.width, bitmap.height);
    if (refusal) return { ok: false, reason: refusal };
    const scale = ocrScale(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, reason: "failed" };
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export async function readImageOfferText(
  file: File,
  {
    timeoutMs = IMAGE_READ_TIMEOUT_MS,
    onProgress,
    signal,
  }: { timeoutMs?: number; onProgress?: (progress: ImageReadProgress) => void; signal?: AbortSignal } = {}
): Promise<ImageTextResult> {
  if (typeof Worker === "undefined" || typeof createImageBitmap === "undefined") return { ok: false, reason: "failed" };
  if (signal?.aborted) return { ok: false, reason: "failed" };

  const canvas = await drawScaled(file);
  if (!(canvas instanceof HTMLCanvasElement)) return canvas;

  let worker: OcrWorker | null = null;
  let settled = false;
  const release = () => {
    void worker?.terminate().catch(() => undefined);
    worker = null;
    canvas.width = 0;
    canvas.height = 0;
  };

  const run = async (): Promise<ImageTextResult> => {
    const { createWorker } = await import("tesseract.js");
    const created = (await createWorker([...OCR_LANGS], OCR_OEM_LSTM_ONLY, {
      workerPath: `${OCR_ASSET_BASE}/worker.min.js`,
      corePath: `${OCR_ASSET_BASE}/core`,
      langPath: `${OCR_ASSET_BASE}/lang`,
      gzip: true,
      workerBlobURL: false,
      // Nothing is kept in browser storage; the model files rely on the HTTP cache.
      cacheMethod: "none",
      logger: (m: { status?: string; progress?: number }) => {
        if (settled || !onProgress || typeof m.progress !== "number") return;
        onProgress({ stage: m.status === "recognizing text" ? "recognizing" : "loading", ratio: m.progress });
      },
    })) as unknown as OcrWorker;
    worker = created;
    // The time limit may have passed while the engine was loading.
    if (settled) return { ok: false, reason: "failed" };
    return readOfferWithEngine(created, canvas, () => settled);
  };

  // The time limit ends the read even if loading the engine itself hangs.
  return new Promise<ImageTextResult>((resolve) => {
    const finish = (result: ImageTextResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      release();
      resolve(result);
    };
    const timer = window.setTimeout(() => finish({ ok: false, reason: "failed" }), timeoutMs);
    // Removing or replacing the image, or leaving the tab, stops the read and
    // terminates the engine instead of letting it run on in the background.
    signal?.addEventListener("abort", () => finish({ ok: false, reason: "failed" }), { once: true });
    run().then(finish, () => finish({ ok: false, reason: "failed" })).finally(() => {
      if (settled) release();
    });
  });
}
