import { afterEach, describe, expect, it, vi } from "vitest";
import { readPdfOfferText } from "./read-pdf-offer-text";

afterEach(() => vi.unstubAllGlobals());

describe("readPdfOfferText cancellation", () => {
  it("starts no worker when the file is removed while its bytes are being read", async () => {
    const WorkerSpy = vi.fn();
    vi.stubGlobal("Worker", WorkerSpy);
    const controller = new AbortController();
    let release!: (buffer: ArrayBuffer) => void;
    const file = { arrayBuffer: () => new Promise<ArrayBuffer>((r) => (release = r)) } as unknown as File;

    const pending = readPdfOfferText(file, 10_000, controller.signal);
    controller.abort();
    release(new ArrayBuffer(8));

    expect(await pending).toEqual({ ok: false, reason: "failed" });
    expect(WorkerSpy).not.toHaveBeenCalled();
  });
});
