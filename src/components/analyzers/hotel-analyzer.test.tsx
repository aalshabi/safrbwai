import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { HotelAnalyzer } from "./hotel-analyzer";

const ar = getDictionary("ar").analyzeHotel;
const en = getDictionary("en").analyzeHotel;

const HOTELS = [
  {
    placeId: "place_one",
    requestedLocaleName: "فندق المصدر الأول",
    formattedAddress: "الرياض، المملكة العربية السعودية",
    latitude: 24.7136,
    longitude: 46.6753,
    primaryType: "hotel",
    businessStatus: "OPERATIONAL",
    googleMapsUri: "https://maps.google.com/?cid=123",
    source: "google_places",
    rating: 5,
    reviews: 1000,
    diagnostics: "MUST_NOT_RENDER",
  },
  {
    placeId: "place_two",
    requestedLocaleName: "فندق المصدر الثاني",
    formattedAddress: "جدة، المملكة العربية السعودية",
    primaryType: "resort_hotel",
    businessStatus: "CLOSED_TEMPORARILY",
    source: "google_places",
  },
];

function apiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function searchResponse(results: unknown[] = HOTELS) {
  return apiResponse({
    ok: true,
    schemaVersion: "hotel-search.v1",
    requestId: "request-hidden",
    data: { source: "google_places", results },
    observations: "MUST_NOT_RENDER",
  });
}

function nameResponse(placeId: string, localizedName: string | null) {
  return apiResponse({
    ok: true,
    schemaVersion: "hotel-name.v1",
    requestId: "request-hidden",
    data: { source: "google_places", placeId, localizedName },
  });
}

function renderAnalyzer(enabled = true, locale: "ar" | "en" = "ar") {
  window.localStorage.setItem("safer-bewae-locale", locale);
  return render(
    <LanguageProvider>
      <HotelAnalyzer enabled={enabled} />
    </LanguageProvider>
  );
}

async function submitSearch(locale: "ar" | "en" = "ar") {
  const dictionary = locale === "ar" ? ar : en;
  fireEvent.change(screen.getByLabelText(dictionary.inputLabel), {
    target: { value: locale === "ar" ? "فندق المصدر" : "Source Hotel" },
  });
  fireEvent.change(screen.getByLabelText(dictionary.cityLabel), {
    target: { value: locale === "ar" ? "الرياض" : "Riyadh" },
  });
  fireEvent.click(screen.getByRole("button", { name: dictionary.identity.searchAction }));
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  }) as typeof requestAnimationFrame;
});

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HotelAnalyzer disabled boundary", () => {
  it("is disabled by default and constructs no request or synthetic result", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(false);

    expect(screen.getByText(ar.identity.disabledTitle)).toBeTruthy();
    expect(screen.getByLabelText(ar.inputLabel).hasAttribute("disabled")).toBe(true);
    expect(screen.getByLabelText(ar.cityLabel).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: ar.identity.searchAction }).hasAttribute("disabled")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("100");
  });

  it("renders the localized English disabled state and correct direction", async () => {
    renderAnalyzer(false, "en");
    expect(await screen.findByText(en.identity.disabledTitle)).toBeTruthy();
    await waitFor(() => expect(document.documentElement.dir).toBe("ltr"));
  });

  it("uses a safe mobile margin with negative overlap only above the breakpoint", () => {
    renderAnalyzer(false);
    const container = screen.getByText(ar.identity.disabledTitle).closest(".container");
    const classes = container?.className.split(/\s+/) ?? [];
    expect(classes).toContain("mt-4");
    expect(classes).toContain("sm:-mt-8");
    expect(classes.some((item) => /^-mt-/.test(item))).toBe(false);
  });
});

describe("HotelAnalyzer enabled flow with mocked transport", () => {
  it("searches with the narrow request and requires explicit selection for ambiguous results", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(searchResponse());
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(true);
    await submitSearch();

    expect(await screen.findByText(ar.identity.ambiguousBody)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: ar.identity.selectAction })).toHaveLength(2);
    expect(screen.queryByText(ar.identity.selectedTitle)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/hotels/search");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      query: "فندق المصدر",
      city: "الرياض",
      locale: "ar",
    });
  });

  it("requires explicit selection even for one eligible result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(searchResponse([HOTELS[0]])));
    renderAnalyzer(true);
    await submitSearch();
    await screen.findByRole("button", { name: ar.identity.selectAction });
    expect(screen.queryByText(ar.identity.selectedTitle)).toBeNull();
  });

  it("renders only approved fields and a distinct source-provided alternate name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(searchResponse())
      .mockResolvedValueOnce(nameResponse("place_one", "Source Hotel One"));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(true);
    await submitSearch();
    const selectButtons = await screen.findAllByRole("button", { name: ar.identity.selectAction });
    fireEvent.click(selectButtons[0]);

    expect(await screen.findByText("Source Hotel One")).toBeTruthy();
    expect(screen.getByText(ar.identity.selectedTitle)).toBeTruthy();
    expect(screen.getByText("24.713600, 46.675300")).toBeTruthy();
    expect(screen.getByText(ar.identity.statuses.operational)).toBeTruthy();
    const sourceLink = screen.getByRole("link", { name: ar.identity.openSource });
    expect(sourceLink.getAttribute("href")).toBe("https://maps.google.com/?cid=123");
    expect(sourceLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(document.body.textContent).not.toContain("place_one");
    expect(document.body.textContent).not.toContain("request-hidden");
    expect(document.body.textContent).not.toContain("MUST_NOT_RENDER");
    expect(document.body.textContent).not.toContain("1000");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      placeId: "place_one",
      locale: "en",
    });
  });

  it("does not invent or repeat a missing alternate name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(searchResponse([HOTELS[0]]))
      .mockResolvedValueOnce(nameResponse("place_one", null));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(true);
    await submitSearch();
    fireEvent.click(await screen.findByRole("button", { name: ar.identity.selectAction }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(ar.identity.alternateName)).toBeNull();
    expect(screen.queryByText(ar.identity.errors.alternateUnavailable)).toBeNull();
  });

  it("shows empty and closed-hotel states without generating a replacement", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(searchResponse([]))
      .mockResolvedValueOnce(searchResponse([HOTELS[1]]))
      .mockResolvedValueOnce(nameResponse("place_two", null));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(true);
    await submitSearch();
    expect(await screen.findByText(ar.identity.emptyTitle)).toBeTruthy();

    await submitSearch();
    fireEvent.click(await screen.findByRole("button", { name: ar.identity.selectAction }));
    expect(await screen.findByText(ar.identity.statuses.temporarilyClosed)).toBeTruthy();
  });

  it.each([
    [400, "invalid"],
    [413, "invalid"],
    [429, "rateLimited"],
    [503, "unavailable"],
  ] as const)("maps HTTP %i to the safe localized %s state", async (status, key) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(apiResponse({ raw: "DO_NOT_SHOW" }, status)));
    renderAnalyzer(true);
    await submitSearch();
    expect(await screen.findByText(ar.identity.errors[key])).toBeTruthy();
    expect(document.body.textContent).not.toContain("DO_NOT_SHOW");
  });

  it("fails closed on timeout, authentication, quota, and malformed provider responses", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("timed out", "AbortError"))
      .mockResolvedValueOnce(apiResponse({ error: { code: "PROVIDER_AUTH" } }, 503))
      .mockResolvedValueOnce(apiResponse({ error: { code: "PROVIDER_QUOTA" } }, 503))
      .mockResolvedValueOnce(apiResponse({ ok: true, schemaVersion: "hotel-search.v1", data: { source: "google_places", results: [{ fake: true }] } }));
    vi.stubGlobal("fetch", fetchMock);
    renderAnalyzer(true);

    for (let index = 0; index < 4; index += 1) {
      await submitSearch();
      expect(await screen.findByText(ar.identity.errors.unavailable)).toBeTruthy();
    }
    expect(document.body.textContent).not.toContain("PROVIDER_AUTH");
    expect(document.body.textContent).not.toContain("PROVIDER_QUOTA");
  });

  it("preserves Arabic and English direction and keyboard-accessible controls", async () => {
    const englishHotel = {
      ...HOTELS[0],
      requestedLocaleName: "Source Hotel One",
      businessStatus: "CLOSED_PERMANENTLY",
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(searchResponse([englishHotel]))
        .mockResolvedValueOnce(nameResponse("place_one", "فندق المصدر الأول"))
    );
    renderAnalyzer(true, "en");
    expect(await screen.findByLabelText(en.inputLabel)).toBeTruthy();
    await submitSearch("en");
    const select = await screen.findByRole("button", { name: en.identity.selectAction });
    select.focus();
    expect(document.activeElement).toBe(select);
    fireEvent.click(select);
    expect(await screen.findByText("فندق المصدر الأول")).toBeTruthy();
    expect(screen.getByText(en.identity.statuses.permanentlyClosed)).toBeTruthy();
    await waitFor(() => expect(document.documentElement.dir).toBe("ltr"));
  });
});
