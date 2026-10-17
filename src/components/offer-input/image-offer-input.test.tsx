import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { ImageTextResult } from "@/lib/offer-input/image-text";
import { readImageOfferText } from "@/lib/offer-input/read-image-offer-text";
import { OfferAnalyzer } from "@/components/analyzers/offer-analyzer";
import { ImageOfferInput } from "./image-offer-input";
import type { ReadFileText } from "./file-offer-input";

vi.mock("@/lib/offer-input/read-image-offer-text", () => ({ readImageOfferText: vi.fn() }));

const ar = getDictionary("ar").analyzeOffer.v1;
const READ = "عرض إلى جدة 3 ليالٍ لشخصين، السعر الإجمالي 2400 ريال، شامل الإفطار، غير شامل الطيران.";
const imageFile = () => new File([new Uint8Array([137, 80, 78, 71])], "offer.png", { type: "image/png" });

function chooseFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no object URLs; the field previews the chosen image.
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.mocked(readImageOfferText).mockReset();
});

describe("ImageOfferInput reading an image on the device", () => {
  function renderInput(readText: ReadFileText) {
    const onExtracted = vi.fn();
    const onFile = vi.fn();
    const view = render(
      <LanguageProvider>
        <ImageOfferInput file={null} onFile={onFile} onExtracted={onExtracted} readText={readText} />
      </LanguageProvider>
    );
    view.rerender(
      <LanguageProvider>
        <ImageOfferInput file={imageFile()} onFile={onFile} onExtracted={onExtracted} readText={readText} />
      </LanguageProvider>
    );
    return { onExtracted, onFile };
  }

  it("shows progress while the models load, then hands the text back for review", async () => {
    let resolve!: (r: ImageTextResult) => void;
    const readText: ReadFileText = (_file, onProgress) => {
      onProgress?.({ stage: "loading", ratio: 0.4 });
      return new Promise((r) => (resolve = r));
    };
    const { onExtracted } = renderInput(readText);
    const status = await screen.findByRole("status");
    expect(status.textContent).toContain(ar.image.loadingModels);
    expect(status.textContent).toContain("40%");
    resolve({ ok: true, text: READ, confidence: 88 });
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith(READ));
  });

  it("stops the read and clears the status when the image is removed mid-read", async () => {
    let signal: AbortSignal | undefined;
    const readText: ReadFileText = (_file, _onProgress, s) => {
      signal = s;
      return new Promise(() => undefined);
    };
    const onFile = vi.fn();
    const props = { onFile, onExtracted: vi.fn(), readText };
    const view = render(<LanguageProvider><ImageOfferInput file={imageFile()} {...props} /></LanguageProvider>);
    expect(await screen.findByRole("status")).toBeTruthy();
    view.rerender(<LanguageProvider><ImageOfferInput file={null} {...props} /></LanguageProvider>);
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the reading label for the second pass and announces no percentage to screen readers", async () => {
    let progress!: Parameters<ReadFileText>[1];
    const readText: ReadFileText = (_file, onProgress) => {
      progress = onProgress;
      return new Promise(() => undefined);
    };
    const view = render(<LanguageProvider><ImageOfferInput file={null} onFile={vi.fn()} onExtracted={vi.fn()} readText={readText} /></LanguageProvider>);
    view.rerender(<LanguageProvider><ImageOfferInput file={imageFile()} onFile={vi.fn()} onExtracted={vi.fn()} readText={readText} /></LanguageProvider>);
    const status = await screen.findByRole("status");
    act(() => progress?.({ stage: "loading", ratio: 0.5 }));
    expect(status.querySelector('[aria-hidden="true"]:not(svg)')?.textContent).toBe("50%");
    act(() => progress?.({ stage: "recognizing", ratio: 0.2 }));
    act(() => progress?.({ stage: "loading", ratio: 0.1 }));
    expect(status.textContent).toContain(ar.image.reading);
    expect(status.textContent).not.toContain(ar.image.loadingModels);
    expect(status.textContent).not.toContain("%");
  });

  it.each(["too_large", "no_text", "unclear", "too_long", "failed"] as const)(
    "shows the %s refusal, clears the image and extracts nothing",
    async (reason) => {
      const { onExtracted, onFile } = renderInput(vi.fn().mockResolvedValue({ ok: false, reason }));
      expect((await screen.findByRole("alert")).textContent).toBe(ar.image.refusals[reason]);
      expect(onFile).toHaveBeenCalledWith(null);
      expect(onExtracted).not.toHaveBeenCalled();
    }
  );
});

describe("OfferAnalyzer image flow", () => {
  it("moves the read text into the reviewable text field and sends nothing until analysis", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(readImageOfferText).mockResolvedValue({ ok: true, text: READ, confidence: 90 });

    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /صورة/ }));
    chooseFile(imageFile());

    expect(await screen.findByText(ar.image.reviewNotice)).toBeTruthy();
    expect(screen.queryByText(ar.pdf.reviewNotice)).toBeNull();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(READ);
    expect(screen.getByRole("tab", { name: "نص" }).getAttribute("aria-selected")).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never submits from the image tab, even while the image is being read", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(readImageOfferText).mockReturnValue(new Promise(() => undefined));
    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /صورة/ }));
    chooseFile(imageFile());
    await screen.findByRole("status");
    expect((document.querySelector('form button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the image tab with the refusal message when the image is unclear", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.mocked(readImageOfferText).mockResolvedValue({ ok: false, reason: "unclear" });

    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /صورة/ }));
    chooseFile(imageFile());

    expect((await screen.findByRole("alert")).textContent).toBe(ar.image.refusals.unclear);
    expect(screen.getByRole("tab", { name: /صورة/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText(ar.image.reviewNotice)).toBeNull();
  });
});
