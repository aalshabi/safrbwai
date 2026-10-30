import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import { copyText } from "@/lib/clipboard/copy-text";
import { ResultCopyAction } from "./result-actions";

vi.mock("@/lib/clipboard/copy-text", () => ({
  copyText: vi.fn(),
}));

const copyTextMock = vi.mocked(copyText);
const ar = getDictionary("ar").analyzeOffer.v2.result;
const en = getDictionary("en").analyzeOffer.v2.result;

const analysis: OfferAnalysis = {
  concerns: [],
  confirmedFacts: [
    {
      key: "nights",
      label: { ar: "عدد الليالي", en: "Nights" },
      value: 5,
      evidence: "PRIVATE_EVIDENCE",
      confidenceType: "exact",
    },
  ],
  missingFields: [],
  contradictions: [],
  checklist: [],
  suggestedQuestions: [
    {
      key: "cancellationPolicy",
      question: {
        ar: "ما سياسة الإلغاء؟",
        en: "What is the cancellation policy?",
      },
      priority: "medium",
    },
  ],
  completeness: {
    present: 1,
    required: 3,
    fields: [{ key: "nights", present: true }],
  },
};

function renderAction(kind: "questions" | "summary", value = analysis) {
  return render(
    <LanguageProvider>
      <ResultCopyAction analysis={value} kind={kind} />
    </LanguageProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("ResultCopyAction", () => {
  it("shows the copy-questions button when questions exist", () => {
    renderAction("questions");
    expect(
      screen.getByRole("button", { name: ar.copy.questionsButton })
    ).toBeTruthy();
  });

  it("does not show the copy-questions button when questions are absent", () => {
    renderAction("questions", { ...analysis, suggestedQuestions: [] });
    expect(
      screen.queryByRole("button", { name: ar.copy.questionsButton })
    ).toBeNull();
  });

  it("supports the English button labels", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    renderAction("summary");

    expect(
      await screen.findByRole("button", { name: en.copy.summaryButton })
    ).toBeTruthy();
  });

  it("announces successful copying inside an aria-live status", async () => {
    copyTextMock.mockResolvedValue({ copied: true, method: "clipboard" });
    renderAction("questions");

    fireEvent.click(
      screen.getByRole("button", { name: ar.copy.questionsButton })
    );

    const message = await screen.findByText(ar.copy.questionsCopied);
    expect(message.closest("[aria-live='polite']")).not.toBeNull();
  });

  it("shows the safe failure message when both copy methods fail", async () => {
    copyTextMock.mockResolvedValue({ copied: false });
    renderAction("summary");

    fireEvent.click(
      screen.getByRole("button", { name: ar.copy.summaryButton })
    );

    expect(await screen.findByText(ar.copy.failed)).toBeTruthy();
  });

  it("prevents duplicate clicks while copying", async () => {
    let finishCopy!: () => void;
    copyTextMock.mockReturnValue(
      new Promise((resolve) => {
        finishCopy = () =>
          resolve({ copied: true, method: "clipboard" });
      })
    );
    renderAction("summary");
    const button = screen.getByRole("button", {
      name: ar.copy.summaryButton,
    });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(copyTextMock).toHaveBeenCalledOnce();
    expect(button.hasAttribute("disabled")).toBe(true);

    finishCopy();
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  });

  it("copies locally without calling fetch or any API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    copyTextMock.mockResolvedValue({ copied: true, method: "clipboard" });
    renderAction("questions");

    fireEvent.click(
      screen.getByRole("button", { name: ar.copy.questionsButton })
    );
    await screen.findByText(ar.copy.questionsCopied);

    expect(copyTextMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
