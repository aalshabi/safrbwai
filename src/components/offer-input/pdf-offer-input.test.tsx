import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { PdfTextResult } from "@/lib/offer-input/pdf-text";
import { readPdfOfferText } from "@/lib/offer-input/read-pdf-offer-text";
import { OfferAnalyzer } from "@/components/analyzers/offer-analyzer";
import { TravelOfferInputSelector } from "./travel-offer-input-selector";
import { FileOfferInput } from "./file-offer-input";

vi.mock("@/lib/offer-input/read-pdf-offer-text", () => ({ readPdfOfferText: vi.fn() }));

const ar = getDictionary("ar").analyzeOffer.v1;
const EXTRACTED = "عرض إلى دبي لمدة 4 ليالٍ لشخصين، السعر الإجمالي 3200 ريال. السعر لا يشمل تذاكر الطيران.";
const pdfFile = () => new File(["%PDF-1.7 synthetic"], "offer.pdf", { type: "application/pdf" });

function chooseFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.mocked(readPdfOfferText).mockReset();
});

describe("PDF tab availability", () => {
  it("stays unavailable in Production while the pdfInput capability is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    render(<LanguageProvider><TravelOfferInputSelector method="text" onSelect={vi.fn()} /></LanguageProvider>);
    expect(screen.getByRole("tab", { name: /ملف PDF/ }).hasAttribute("disabled")).toBe(true);
  });

  it("is offered on a Preview deployment, while image and link stay unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const onSelect = vi.fn();
    render(<LanguageProvider><TravelOfferInputSelector method="text" onSelect={onSelect} /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /ملف PDF/ }));
    expect(onSelect).toHaveBeenCalledWith("pdf");
    expect(screen.getByRole("tab", { name: /صورة/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("tab", { name: /رابط/ }).hasAttribute("disabled")).toBe(true);
  });
});

describe("FileOfferInput reading a PDF on the device", () => {
  function renderInput(result: PdfTextResult) {
    const onExtracted = vi.fn();
    const onFile = vi.fn();
    const readText = vi.fn().mockResolvedValue(result);
    const view = render(
      <LanguageProvider>
        <FileOfferInput file={null} onFile={onFile} onExtracted={onExtracted} readText={readText} />
      </LanguageProvider>
    );
    view.rerender(
      <LanguageProvider>
        <FileOfferInput file={pdfFile()} onFile={onFile} onExtracted={onExtracted} readText={readText} />
      </LanguageProvider>
    );
    return { onExtracted, onFile, readText };
  }

  it("hands the extracted text back for review", async () => {
    const { onExtracted, readText } = renderInput({ ok: true, text: EXTRACTED, pages: 1 });
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith(EXTRACTED));
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it.each(["no_text", "encrypted", "too_many_pages", "too_long", "failed"] as const)(
    "shows the %s refusal, clears the file and extracts nothing",
    async (reason) => {
      const { onExtracted, onFile } = renderInput({ ok: false, reason });
      expect(await screen.findByRole("alert")).toHaveProperty("textContent", ar.pdf.refusals[reason]);
      expect(onFile).toHaveBeenCalledWith(null);
      expect(onExtracted).not.toHaveBeenCalled();
    }
  );
});

describe("OfferAnalyzer PDF flow", () => {
  it("moves the extracted text into the reviewable text field and sends nothing until analysis", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(readPdfOfferText).mockResolvedValue({ ok: true, text: EXTRACTED, pages: 1 });

    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /ملف PDF/ }));
    chooseFile(pdfFile());

    expect(await screen.findByText(ar.pdf.reviewNotice)).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(EXTRACTED);
    expect(screen.getByRole("tab", { name: "نص" }).getAttribute("aria-selected")).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the PDF tab with the refusal message when the file has no text", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.mocked(readPdfOfferText).mockResolvedValue({ ok: false, reason: "no_text" });

    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /ملف PDF/ }));
    chooseFile(pdfFile());

    expect((await screen.findByRole("alert")).textContent).toBe(ar.pdf.refusals.no_text);
    expect(screen.getByRole("tab", { name: /ملف PDF/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText(ar.pdf.reviewNotice)).toBeNull();
  });
});
