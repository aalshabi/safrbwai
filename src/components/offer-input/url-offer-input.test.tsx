import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readUrlOfferText } from "@/lib/offer-input/read-url-offer-text";
import { OfferAnalyzer } from "@/components/analyzers/offer-analyzer";
import { UrlOfferInput } from "./url-offer-input";

vi.mock("@/lib/offer-input/read-url-offer-text", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/offer-input/read-url-offer-text")>()),
  readUrlOfferText: vi.fn(),
}));

const ar = getDictionary("ar").analyzeOffer.v1;
const PAGE = "عرض دبي 4 ليالٍ لشخصين بسعر 3200 ريال، غير شامل الطيران.";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.mocked(readUrlOfferText).mockReset();
});

describe("UrlOfferInput", () => {
  function renderInput(readUrl = vi.fn(), value = "https://offers.example.com/dubai") {
    const onExtracted = vi.fn();
    render(
      <LanguageProvider>
        <UrlOfferInput value={value} onChange={vi.fn()} error={null} onExtracted={onExtracted} readUrl={readUrl} />
      </LanguageProvider>
    );
    return { onExtracted, readUrl };
  }

  it("reads the page on demand and hands back its text with the link notes", async () => {
    const signals = [{ code: "known_site" as const, severity: "info" as const, detail: "booking.com" }];
    const { onExtracted, readUrl } = renderInput(vi.fn().mockResolvedValue({ ok: true, text: PAGE, finalUrl: "https://x", signals }));
    fireEvent.click(screen.getByRole("button", { name: ar.url.read }));
    await waitFor(() => expect(onExtracted).toHaveBeenCalledWith(PAGE, signals));
    expect(readUrl.mock.calls[0][0]).toBe("https://offers.example.com/dubai");
  });

  it("reads with Enter instead of submitting the form", async () => {
    const { readUrl } = renderInput(vi.fn().mockResolvedValue({ ok: false, reason: "not_found", signals: [] }));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await waitFor(() => expect(readUrl).toHaveBeenCalledTimes(1));
  });

  it("shows a refusal with the notes about the link, and the domain in left-to-right order", async () => {
    renderInput(
      vi.fn().mockResolvedValue({
        ok: false,
        reason: "robots_disallowed",
        signals: [{ code: "lookalike", severity: "warn", detail: "booking.com" }],
      }),
      "https://booking-deals.com/x"
    );
    fireEvent.click(screen.getByRole("button", { name: ar.url.read }));
    expect((await screen.findByRole("alert")).textContent).toBe(ar.url.refusals.robots_disallowed);
    const note = screen.getByRole("region", { name: ar.url.signalsTitle }).querySelector('[data-signal="lookalike"]')!;
    expect(note.textContent).toBe(ar.url.signals.lookalike.replace("{domain}", "booking.com"));
    expect(note.querySelector('bdi[dir="ltr"]')?.textContent).toBe("booking.com");
  });

  it("falls back to the generic message for an unknown reason", async () => {
    renderInput(vi.fn().mockResolvedValue({ ok: false, reason: "something_new", signals: [] }));
    fireEvent.click(screen.getByRole("button", { name: ar.url.read }));
    expect((await screen.findByRole("alert")).textContent).toBe(ar.url.refusals.failed);
  });

  it("keeps a live status region in place so the reading message is announced", async () => {
    let finish: (v: unknown) => void = () => undefined;
    renderInput(vi.fn(() => new Promise((r) => (finish = r))));
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: ar.url.read }));
    await waitFor(() => expect(screen.getByRole("status")).toBe(status));
    expect(status.textContent).toBe(ar.url.reading);
    finish({ ok: false, reason: "not_found", signals: [] });
    await waitFor(() => expect(status.textContent).toBe(""));
  });

  it("disables reading for an empty link", () => {
    renderInput(vi.fn(), "");
    expect((screen.getByRole("button", { name: ar.url.read }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("OfferAnalyzer link flow", () => {
  it("moves the page text into the reviewable text field with the link notes, and analyzes nothing yet", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(readUrlOfferText).mockResolvedValue({
      ok: true,
      text: PAGE,
      finalUrl: "https://agoda-deals.com/x",
      signals: [
        { code: "shortener", severity: "info" },
        { code: "lookalike", severity: "warn", detail: "agoda.com" },
      ],
    });

    render(<LanguageProvider><OfferAnalyzer /></LanguageProvider>);
    fireEvent.click(screen.getByRole("tab", { name: /رابط/ }));
    expect((document.querySelector('form button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "https://bit.ly/abc" } });
    fireEvent.click(screen.getByRole("button", { name: ar.url.read }));

    const notice = await screen.findByText(ar.url.reviewNotice);
    // Focus lands on the review notice, not on <body>, after the tab switches.
    await waitFor(() => expect(document.activeElement).toBe(notice));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(PAGE);
    expect(screen.getByRole("tab", { name: "نص" }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelector('[data-signal="lookalike"]')?.textContent).toContain("agoda.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("readUrlOfferText", () => {
  const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("posts only the URL and returns the reading", async () => {
    const { readUrlOfferText: real } = await vi.importActual<typeof import("@/lib/offer-input/read-url-offer-text")>(
      "@/lib/offer-input/read-url-offer-text"
    );
    const fetchImpl = vi.fn().mockResolvedValue(res(200, { ok: true, text: PAGE, finalUrl: "https://x/", signals: [], requestId: "r" }));
    expect(await real("https://x/", { fetchImpl })).toEqual({ ok: true, text: PAGE, finalUrl: "https://x/", signals: [] });
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe("/api/offer/read-url");
    expect(JSON.parse(init.body)).toEqual({ url: "https://x/" });
  });

  it.each([
    ["a rate limit", () => Promise.resolve(res(429, { ok: false })), "rate_limited"],
    ["a refusal", () => Promise.resolve(res(200, { ok: false, reason: "not_found", signals: [] })), "not_found"],
    ["a non-JSON error page", () => Promise.resolve(new Response("<html>", { status: 502 })), "failed"],
    ["a network error", () => Promise.reject(new TypeError("offline")), "failed"],
  ])("maps %s", async (_label, respond, reason) => {
    const { readUrlOfferText: real } = await vi.importActual<typeof import("@/lib/offer-input/read-url-offer-text")>(
      "@/lib/offer-input/read-url-offer-text"
    );
    expect(await real("https://x/", { fetchImpl: vi.fn(respond) as unknown as typeof fetch })).toMatchObject({ ok: false, reason });
  });

  it("times out", async () => {
    const { readUrlOfferText: real } = await vi.importActual<typeof import("@/lib/offer-input/read-url-offer-text")>(
      "@/lib/offer-input/read-url-offer-text"
    );
    const hang = vi.fn((_u: string, init: RequestInit) => new Promise((_r, reject) => init.signal?.addEventListener("abort", () => reject(new Error("abort")))));
    expect(await real("https://x/", { fetchImpl: hang as unknown as typeof fetch, timeoutMs: 20 })).toMatchObject({ ok: false, reason: "timeout" });
  });
});
