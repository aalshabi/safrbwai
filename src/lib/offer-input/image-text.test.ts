import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_MAX_PIXELS,
  IMAGE_MIN_CONFIDENCE,
  IMAGE_OCR_MAX_SIDE,
  checkImageDimensions,
  cleanOcrWords,
  finalizeOcrText,
  isMostlyArabic,
  layoutOcrWords,
  mergeOcrPasses,
  ocrScale,
  readImageHeaderSize,
  repairOcrNegations,
  type OcrWord,
} from "./image-text";
import { OFFER_LIMITS } from "./types";

const tesseract = vi.hoisted(() => ({
  createWorker: vi.fn(),
  recognize: vi.fn(),
  reinitialize: vi.fn(),
  setParameters: vi.fn(),
  terminate: vi.fn(),
}));
vi.mock("tesseract.js", () => ({ createWorker: tesseract.createWorker }));

/** A word at a row (y) and horizontal position (x), 100 px wide by default. */
const w = (text: string, x: number, y: number, confidence = 95, width = 100): OcrWord => ({
  text,
  confidence,
  bbox: { x0: x, y0: y, x1: x + width, y1: y + 40 },
});
/** A recognize() page made of words. */
const page = (words: OcrWord[], confidence = 90) => ({
  data: { confidence, blocks: [{ paragraphs: [{ lines: [{ words }] }] }] },
});

const OFFER = "عرض باقة اسطنبول: 5 ليالٍ في فندق Grand Bosphorus Hotel لشخصين، السعر الإجمالي 4500 ريال.";

describe("image text checks", () => {
  it("refuses decoded images over the pixel cap and invalid sizes", () => {
    expect(checkImageDimensions(1170, 2532)).toBeNull();
    expect(checkImageDimensions(8000, 5000)).toBeNull();
    expect(checkImageDimensions(8000, 5001)).toBe("too_large");
    expect(IMAGE_MAX_PIXELS).toBe(40_000_000);
    expect(checkImageDimensions(0, 100)).toBe("failed");
    expect(checkImageDimensions(Number.NaN, 100)).toBe("failed");
  });

  it("scales only images whose longest side exceeds the OCR limit", () => {
    expect(ocrScale(1170, 2532)).toBe(1);
    expect(ocrScale(6000, 4000)).toBeCloseTo(IMAGE_OCR_MAX_SIDE / 6000);
  });

  it("normalizes OCR text like PDF text and keeps the confidence", () => {
    const result = finalizeOcrText(`  ${OFFER.replace("ي", "ی")}\r\n\r\n\r\nشامل الإفطار  `, 87.6);
    expect(result).toEqual({ ok: true, text: `${OFFER}\n\nشامل الإفطار`, confidence: 88 });
  });

  it("refuses too little text, low confidence and over-long text, never truncating", () => {
    expect(finalizeOcrText("فندق 3", 95)).toEqual({ ok: false, reason: "no_text" });
    expect(finalizeOcrText(OFFER, IMAGE_MIN_CONFIDENCE - 1)).toEqual({ ok: false, reason: "unclear" });
    expect(finalizeOcrText(OFFER, Number.NaN)).toEqual({ ok: false, reason: "unclear" });
    const long = `${OFFER} `.repeat(Math.ceil(OFFER_LIMITS.textMax / OFFER.length) + 1);
    expect(finalizeOcrText(long, 95)).toEqual({ ok: false, reason: "too_long" });
  });
});

describe("image header size", () => {
  it("reads PNG dimensions from a committed screenshot", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const png = new Uint8Array(readFileSync(join(__dirname, "__fixtures__", "image", "en1-2x.png")));
    const size = readImageHeaderSize(png);
    expect(size?.width).toBeGreaterThan(500);
    expect(size?.height).toBeGreaterThan(100);
  });

  it("reads JPEG dimensions past an APP segment", () => {
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x4e, 0x20, 0x27, 0x10, 0x03, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    expect(readImageHeaderSize(jpeg)).toEqual({ width: 10000, height: 20000 });
  });

  it("reads WEBP (VP8X) dimensions and refuses a huge image before decoding", () => {
    const webp = new Uint8Array(30);
    webp.set([...Buffer.from("RIFF")], 0);
    webp.set([...Buffer.from("WEBPVP8X")], 8);
    // 20000 × 20000: stored as size − 1, little-endian, 24-bit.
    webp.set([0x1f, 0x4e, 0x00, 0x1f, 0x4e, 0x00], 24);
    const size = readImageHeaderSize(webp);
    expect(size).toEqual({ width: 20000, height: 20000 });
    expect(checkImageDimensions(size!.width, size!.height)).toBe("too_large");
  });

  it("returns null for an unknown header", () => {
    expect(readImageHeaderSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});

describe("OCR word merging and layout", () => {
  // «5 ليالٍ في فندق Grand Hotel» with «ليالٍ» misread as "Ju" by the
  // Arabic+English pass, and the short line «لشخصين» missed by it.
  const primary = [
    w("Grand", 0, 0), w("Hotel", 110, 0), w("فندق", 220, 0), w("في", 330, 0), w("Ju", 440, 0, 90), w("5", 550, 0),
    w("الإفطار", 300, 100), w("شامل", 410, 100),
  ];
  const arabicOnly = [
    w("11016١", 0, 0, 55), w("5١0م805", 110, 0, 25), w("فندق", 220, 0), w("في", 330, 0), w("ليالٍ", 440, 0, 73), w("5", 550, 0),
    w("لشخصين", 450, 50, 91),
    w("الإفطار", 300, 100), w("شامل", 410, 100),
    w("قريب", 0, 200, 60),
  ];

  it("replaces Latin misreads on Arabic lines and adds confident Arabic words the main pass missed", () => {
    const merged = mergeOcrPasses(primary, arabicOnly);
    const texts = merged.map((x) => x.text);
    expect(texts).toContain("ليالٍ");
    expect(texts).not.toContain("Ju");
    expect(texts).toContain("Grand");
    expect(texts).toContain("لشخصين");
    // Low-confidence and non-Arabic readings never replace or add anything.
    expect(texts).not.toContain("11016١");
    expect(texts).not.toContain("قريب");
  });

  it("keeps a Latin word whose Arabic-only reading is not confidently Arabic", () => {
    const merged = mergeOcrPasses([w("Hilton", 0, 0), w("فندق", 110, 0)], [w("هيلتون", 0, 0, 55), w("فندق", 110, 0)]);
    expect(merged.map((x) => x.text)).toEqual(["Hilton", "فندق"]);
  });

  it("does not touch Latin words on a line without Arabic", () => {
    const merged = mergeOcrPasses([w("Breakfast", 0, 0), w("included", 110, 0)], [w("بريك", 0, 0, 99), w("فاست", 110, 0, 99)]);
    expect(merged.map((x) => x.text)).toEqual(["Breakfast", "included"]);
  });

  it("lays rows out top to bottom, right to left, keeping Latin runs in order", () => {
    const text = layoutOcrWords(mergeOcrPasses(primary, arabicOnly));
    expect(text).toBe("5 ليالٍ في فندق Grand Hotel\nلشخصين\nشامل الإفطار");
  });

  it("reads an English image left to right", () => {
    expect(layoutOcrWords([w("price", 110, 0), w("Total", 0, 0), w("SAR", 330, 0), w("3200", 220, 0)])).toBe("Total price 3200 SAR");
    expect(isMostlyArabic([w("Total", 0, 0), w("فندق", 110, 0)])).toBe(false);
  });

  it("drops bidi marks and empty words from the engine output", () => {
    expect(cleanOcrWords([w("\u200eGrand\u200f", 0, 0), w("\u200f", 110, 0)]).map((x) => x.text)).toEqual(["Grand"]);
  });
});

describe("negation repair", () => {
  it.each([
    ["السعر لاا يشمل الطيران", "السعر لا يشمل الطيران"],
    ["الأسعار لاتشمل الضرائب", "الأسعار لا تشمل الضرائب"],
    ["لايشمل التأمين", "لا يشمل التأمين"],
    ["لايتضمن الإفطار", "لا يتضمن الإفطار"],
    ["غيرشامل الطيران", "غير شامل الطيران"],
    ["ولايشمل الطيران", "ولا يشمل الطيران"],
    ["فلايشمل الطيران", "فلا يشمل الطيران"],
    ["شامل الإفطار وغيرشامل الطيران", "شامل الإفطار وغير شامل الطيران"],
    ["ليسشامل الطيران", "ليس شامل الطيران"],
    ["•لايشمل الطيران", "• لا يشمل الطيران"],
    ["*غيرشامل الطيران", "* غير شامل الطيران"],
    ["-غير شامل الطيران", "- غير شامل الطيران"],
    ["1-غير شامل الطيران", "1- غير شامل الطيران"],
    ["ولاا يشمل", "ولا يشمل"],
  ])("repairs «%s»", (raw, fixed) => {
    expect(repairOcrNegations(raw)).toBe(fixed);
  });

  it.each(["لايت", "لايف ستايل", "بلاتشمل", "لا يشمل", "غير شامل", "ولايت", "علاا", "غيرها", "- لا يشمل"])("leaves «%s» unchanged", (text) => {
    expect(repairOcrNegations(text)).toBe(text);
  });

  it("is applied before the text is offered for review", () => {
    const result = finalizeOcrText("عرض دبي 4 ليالٍ بسعر 3200 ريال، لاا يشمل الطيران", 90);
    expect(result).toMatchObject({ ok: true, text: "عرض دبي 4 ليالٍ بسعر 3200 ريال، لا يشمل الطيران" });
  });
});

describe("readImageOfferText", () => {
  const drawImage = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("Worker", class {});
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1200, height: 2400, close: vi.fn() })));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    tesseract.terminate.mockResolvedValue(undefined);
    tesseract.reinitialize.mockResolvedValue(undefined);
    tesseract.setParameters.mockResolvedValue(undefined);
    tesseract.createWorker.mockResolvedValue({
      recognize: tesseract.recognize,
      reinitialize: tesseract.reinitialize,
      setParameters: tesseract.setParameters,
      terminate: tesseract.terminate,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    tesseract.createWorker.mockReset();
    tesseract.recognize.mockReset();
    tesseract.terminate.mockReset();
    tesseract.reinitialize.mockReset();
    tesseract.setParameters.mockReset();
  });

  const file = () => new File([new Uint8Array([1])], "offer.png", { type: "image/png" });

  const ENGLISH = "Dubai package offer 4 nights at Marina View Hotel for 2 adults, total 3200 SAR";
  const englishPage = () => page(ENGLISH.split(" ").map((t, i) => w(t, i * 110, 0)), 91);

  it("loads the engine and models from this site only, keeps nothing in storage, and terminates the worker", async () => {
    tesseract.recognize.mockResolvedValue(englishPage());
    const { readImageOfferText } = await import("./read-image-offer-text");
    const progress = vi.fn();
    expect(await readImageOfferText(file(), { onProgress: progress })).toEqual({ ok: true, text: ENGLISH, confidence: 91 });
    // An English image needs no Arabic-only pass.
    expect(tesseract.recognize).toHaveBeenCalledTimes(1);
    expect(tesseract.reinitialize).not.toHaveBeenCalled();

    const [langs, , options] = tesseract.createWorker.mock.calls[0];
    expect(langs).toEqual(["ara", "eng"]);
    expect(options).toMatchObject({
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      gzip: true,
      workerBlobURL: false,
      cacheMethod: "none",
    });
    for (const key of ["workerPath", "corePath", "langPath"]) expect(options[key]).toMatch(/^\/ocr\//);
    options.logger({ status: "recognizing text", progress: 0.5 });
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(tesseract.terminate).toHaveBeenCalled();
  });

  it("refuses an oversized image before loading the engine", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 9000, height: 9000, close: vi.fn() })));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file())).toEqual({ ok: false, reason: "too_large" });
    expect(tesseract.createWorker).not.toHaveBeenCalled();
  });

  it("refuses an image whose header declares too many pixels, without decoding it", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    png.set([0, 0, 0x4e, 0x20, 0, 0, 0x4e, 0x20], 16); // 20000 × 20000
    const big = new File([png], "big.png", { type: "image/png" });
    // jsdom's Blob lacks arrayBuffer(); browsers have it.
    Object.defineProperty(big, "slice", { value: () => ({ arrayBuffer: async () => png.buffer }) });
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(big)).toEqual({ ok: false, reason: "too_large" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("refuses an image the browser cannot decode", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => Promise.reject(new Error("decode"))));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file())).toEqual({ ok: false, reason: "failed" });
  });

  it("ends in a refusal and terminates the worker when recognition exceeds the time limit", async () => {
    tesseract.recognize.mockReturnValue(new Promise(() => undefined));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file(), { timeoutMs: 20 })).toEqual({ ok: false, reason: "failed" });
    expect(tesseract.terminate).toHaveBeenCalled();
  });

  it("stops and terminates the worker when the caller aborts", async () => {
    tesseract.recognize.mockReturnValue(new Promise(() => undefined));
    const { readImageOfferText } = await import("./read-image-offer-text");
    const controller = new AbortController();
    const pending = readImageOfferText(file(), { signal: controller.signal });
    await vi.waitFor(() => expect(tesseract.recognize).toHaveBeenCalled());
    controller.abort();
    expect(await pending).toEqual({ ok: false, reason: "failed" });
    expect(tesseract.terminate).toHaveBeenCalled();
  });

  it("stops without loading the engine when aborted while the image is decoding", async () => {
    let decoded!: (bitmap: unknown) => void;
    vi.stubGlobal("createImageBitmap", vi.fn(() => new Promise((r) => (decoded = r))));
    const { readImageOfferText } = await import("./read-image-offer-text");
    const controller = new AbortController();
    const pending = readImageOfferText(file(), { signal: controller.signal });
    await vi.waitFor(() => expect(decoded).toBeTypeOf("function"));
    controller.abort();
    expect(await pending).toEqual({ ok: false, reason: "failed" });
    decoded({ width: 1200, height: 2400, close: vi.fn() });
    await new Promise((r) => setTimeout(r, 10));
    expect(tesseract.createWorker).not.toHaveBeenCalled();
  });

  it("times out a decode that never finishes", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(() => new Promise(() => undefined)));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file(), { timeoutMs: 20 })).toEqual({ ok: false, reason: "failed" });
    expect(tesseract.createWorker).not.toHaveBeenCalled();
  });

  it("ends in a refusal even when loading the engine hangs", async () => {
    tesseract.createWorker.mockReturnValue(new Promise(() => undefined));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file(), { timeoutMs: 20 })).toEqual({ ok: false, reason: "failed" });
  });

  it("gives a mostly Arabic image a second, Arabic-only sparse-text pass and merges it", async () => {
    const line = (words: string[]) => words.map((t, i) => w(t, 1000 - i * 110, 0));
    tesseract.recognize
      .mockResolvedValueOnce(page(line(["عرض", "إلى", "دبي", "4", "Ju", "بسعر", "3200", "ريال"]), 88))
      .mockResolvedValueOnce(page(line(["عرض", "إلى", "دبي", "4", "ليالٍ", "بسعر", "3200", "ريال"]), 80));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file())).toEqual({ ok: true, text: "عرض إلى دبي 4 ليالٍ بسعر 3200 ريال", confidence: 88 });
    expect(tesseract.reinitialize).toHaveBeenCalledWith(["ara"], 1);
    expect(tesseract.setParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: "11" }));
  });

  it("passes low-confidence output through the same refusal as the pure check", async () => {
    tesseract.recognize.mockResolvedValue(page(ENGLISH.split(" ").map((t, i) => w(t, i * 110, 0)), 20));
    const { readImageOfferText } = await import("./read-image-offer-text");
    expect(await readImageOfferText(file())).toEqual({ ok: false, reason: "unclear" });
  });
});
