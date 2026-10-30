import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { copyText } from "@/lib/clipboard/copy-text";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import { OfferAnalyzer } from "./offer-analyzer";

vi.mock("@/lib/clipboard/copy-text", () => ({ copyText: vi.fn() }));

const d = getDictionary("ar");
const copyTextMock = vi.mocked(copyText);
const VALID_TEXT = "عرض إلى دبي خمس ليالٍ لشخصين شامل الإفطار، السعر ٣٢٠٠ ر.س، التأشيرة غير مشمولة.";

const SAMPLE_ANALYSIS: OfferAnalysis = {
  concerns: [],
  confirmedFacts: [
    { key: "nights", label: { ar: "عدد الليالي", en: "Nights" }, value: 5, evidence: "٥ ليالٍ", confidenceType: "exact" },
  ],
  missingFields: [{ key: "cancellationPolicy", label: { ar: "سياسة الإلغاء", en: "Cancellation policy" }, requirement: "recommended" }],
  contradictions: [],
  checklist: [{ key: "nights", label: { ar: "عدد الليالي", en: "Nights" }, status: "present", evidence: ["٥ ليالٍ"], explanation: { ar: "واضحة.", en: "clear" } }],
  suggestedQuestions: [{ key: "cancellationPolicy", question: { ar: "ما سياسة الإلغاء؟", en: "policy?" }, priority: "medium" }],
  completeness: { present: 1, required: 3, fields: [{ key: "totalPrice", present: false }, { key: "currency", present: false }, { key: "nights", present: true }] },
};

function okResponse(analysis: OfferAnalysis) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ ok: true, schemaVersion: "1.0", requestId: "srv-1", data: { source: "text", extraction: { facts: {}, warnings: [] }, analysis }, meta: { durationMs: 1 } }),
  };
}
function errResponse(status: number) {
  return {
    ok: false,
    status,
    headers: { get: (name: string) => name === "x-safrbwai-application-response" ? "1" : null },
    json: async () => ({
      ok: false,
      schemaVersion: "1.0",
      requestId: "srv-1",
      error: { code: "INTERNAL_ERROR" },
    }),
  };
}
// A 429 may originate at an edge WAF before the app, so its body is arbitrary
// and must never be surfaced. This marker asserts we ignore it.
const WAF_MARKER = "RAW_EDGE_WAF_BODY_MARKER";
function rateLimitedResponse() {
  return { ok: false, status: 429, json: async () => ({ message: WAF_MARKER }) };
}

function renderAnalyzer() {
  return render(
    <LanguageProvider>
      <OfferAnalyzer />
    </LanguageProvider>
  );
}

async function goToReview() {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: VALID_TEXT } });
  fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.startAnalysis }));
  await screen.findByRole("button", { name: d.analyzeOffer.v1.review.confirmSend });
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
});
beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  copyTextMock.mockReset();
  copyTextMock.mockResolvedValue({ copied: true, method: "clipboard" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("OfferAnalyzer text → API integration", () => {
  it("uses a safe mobile top margin and scopes overlap to larger screens", () => {
    renderAnalyzer();

    const betaHeading = screen.getByRole("heading", {
      name: d.analyzeOffer.v2.releaseScope.title,
    });
    const layoutContainer = betaHeading.closest(".container");
    const classTokens = layoutContainer?.className.split(/\s+/) ?? [];

    expect(layoutContainer).not.toBeNull();
    expect(classTokens).toContain("mt-4");
    expect(classTokens).toContain("sm:-mt-4");
    expect(classTokens.some((token) => /^-mt-/.test(token))).toBe(false);
  });

  it("enables the text confirm button on valid input", async () => {
    renderAnalyzer();
    await goToReview();
    expect(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }).hasAttribute("disabled")).toBe(false);
  });

  it("shows the analysis result on a successful call (Arabic)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(SAMPLE_ANALYSIS));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.result.title)).toBeTruthy());
    // called the same-origin endpoint with only the text payload
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/offer/analyze");
    expect(String(fetchMock.mock.calls[0][1]?.body)).toContain('"type":"text"');
    // renders sections, no opaque score
    expect(screen.getByText(d.analyzeOffer.v2.result.completenessTitle)).toBeTruthy();
    expect(screen.queryByText(d.analyzeOffer.v2.feedback.question)).toBeNull();
    expect(screen.queryByText(d.analyzeOffer.v2.errors.requestIdLabel)).toBeNull();
    expect(document.body.textContent?.toLowerCase()).not.toContain("score");
  });

  it("shows beta feedback only when the public flag is the literal value true", async () => {
    vi.stubEnv("NEXT_PUBLIC_BETA_FEEDBACK_ENABLED", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(SAMPLE_ANALYSIS)));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    expect(await screen.findByText(d.analyzeOffer.v2.feedback.question)).toBeTruthy();
  });

  it("sends feedback without the offer text or evidence", async () => {
    vi.stubEnv("NEXT_PUBLIC_BETA_FEEDBACK_ENABLED", "true");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SAMPLE_ANALYSIS))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.feedback.question);
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v2.feedback.yes }));
    await screen.findByText(d.analyzeOffer.v2.feedback.thanks);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const feedbackPayload = String(fetchMock.mock.calls[1][1]?.body);
    expect(feedbackPayload).not.toContain(VALID_TEXT);
    expect(feedbackPayload).not.toContain("٥ ليالٍ");
    expect(JSON.parse(feedbackPayload)).toEqual({
      requestId: "srv-1",
      feedback: "helpful",
      locale: "ar",
      sourceType: "text",
      schemaVersion: "1.0",
    });
  });

  it("keeps the analysis result visible when feedback storage fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_BETA_FEEDBACK_ENABLED", "true");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(SAMPLE_ANALYSIS))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          ok: false,
          error: { code: "STORAGE_UNAVAILABLE" },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.feedback.question);
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v2.feedback.yes }));
    await screen.findByText(d.analyzeOffer.v2.feedback.error);

    expect(screen.getByText(d.analyzeOffer.v2.result.title)).toBeTruthy();
    expect(screen.getByText(d.analyzeOffer.v2.result.confirmedTitle)).toBeTruthy();
  });

  it("shows a loading state and prevents duplicate submissions", async () => {
    let resolve!: (v: unknown) => void;
    const fetchMock = vi.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();

    const confirm = screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend });
    fireEvent.click(confirm);
    await screen.findByText(d.analyzeOffer.v2.loading);
    // the confirm button is now disabled → a second click cannot re-submit
    expect(confirm.hasAttribute("disabled")).toBe(true);
    fireEvent.click(confirm);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(okResponse(SAMPLE_ANALYSIS));
  });

  it("maps 422 to a clear Arabic error without leaking user text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errResponse(422)));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.errors.notAnalyzable)).toBeTruthy());
    expect(document.body.textContent).not.toContain(VALID_TEXT);
  });

  it("maps 501 and 500 to their messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errResponse(501)));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.errors.sourceNotSupported)).toBeTruthy());

    cleanup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errResponse(500)));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.errors.server)).toBeTruthy());
  });

  it("shows an application error request ID and copies it without a network request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(errResponse(500));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.errors.requestIdLabel);
    expect(screen.getByText("srv-1")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: d.analyzeOffer.v2.errors.copyRequestId })
    );

    await waitFor(() => expect(copyTextMock).toHaveBeenCalledWith("srv-1"));
    expect(screen.getByText(d.analyzeOffer.v2.errors.requestIdCopied)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not show a request ID when the application error response has none", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: (name: string) => name === "x-safrbwai-application-response" ? "1" : null },
      json: async () => ({
        ok: false,
        schemaVersion: "1.0",
        error: { code: "INTERNAL_ERROR" },
      }),
    }));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.errors.server);
    expect(screen.queryByText(d.analyzeOffer.v2.errors.requestIdLabel)).toBeNull();
    expect(
      screen.queryByRole("button", { name: d.analyzeOffer.v2.errors.copyRequestId })
    ).toBeNull();
  });

  it("never surfaces a raw application stack or response body", async () => {
    const rawMarker = "RAW_STACK_AND_RESPONSE_MARKER";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: (name: string) => name === "x-safrbwai-application-response" ? "1" : null },
      json: async () => ({
        ok: false,
        schemaVersion: "1.0",
        requestId: "safe-id-2",
        error: {
          code: "INTERNAL_ERROR",
          message: rawMarker,
          stack: `Error: ${rawMarker}`,
        },
      }),
    }));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.errors.server);
    expect(screen.getByText("safe-id-2")).toBeTruthy();
    expect(document.body.textContent).not.toContain(rawMarker);
  });

  it("does not derive a request ID from an unmarked edge response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => null },
      json: async () => ({
        ok: false,
        schemaVersion: "1.0",
        requestId: "edge-generated-id",
        error: { code: "INTERNAL_ERROR" },
      }),
    }));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));

    await screen.findByText(d.analyzeOffer.v2.errors.server);
    expect(screen.queryByText("edge-generated-id")).toBeNull();
    expect(screen.queryByText(d.analyzeOffer.v2.errors.requestIdLabel)).toBeNull();
  });

  it("maps a network failure to the network error and offers retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.errors.network)).toBeTruthy());
    expect(screen.getByRole("button", { name: d.analyzeOffer.v2.actions.retry })).toBeTruthy();
  });

  // (Task 1.1) 429 → the dedicated Arabic message, decided on STATUS alone
  it("shows the rate-limit message on HTTP 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(rateLimitedResponse()));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => expect(screen.getByText(d.analyzeOffer.v2.errors.rateLimited)).toBeTruthy());
  });

  // (Task 1.3) the raw edge/WAF body is never surfaced to the user
  it("never shows the raw 429 body from an edge WAF", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(rateLimitedResponse()));
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => screen.getByText(d.analyzeOffer.v2.errors.rateLimited));
    expect(document.body.textContent).not.toContain(WAF_MARKER);
    expect(screen.queryByText(d.analyzeOffer.v2.errors.requestIdLabel)).toBeNull();
  });

  // (Task 1.2) a 60s cooldown blocks resubmission with NO auto-retry
  it("blocks resubmission for the cooldown window and offers no auto-retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse());
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer();
    await goToReview();
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    await waitFor(() => screen.getByText(d.analyzeOffer.v2.errors.rateLimited));

    // a visible countdown is shown, and no retry button appears during cooldown
    expect(screen.getByText(/ثانية/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: d.analyzeOffer.v2.actions.retry })).toBeNull();

    // editing is still allowed; re-confirming must NOT hit the API again
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v2.actions.edit }));
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.startAnalysis }));
    await screen.findByRole("button", { name: d.analyzeOffer.v1.review.confirmSend });
    fireEvent.click(screen.getByRole("button", { name: d.analyzeOffer.v1.review.confirmSend }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
