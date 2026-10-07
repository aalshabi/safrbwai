import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_PLACE_DETAILS_FIELD_MASK,
  GOOGLE_PLACE_DETAILS_SCOPE,
  GOOGLE_TEXT_SEARCH_FIELD_MASK,
  GOOGLE_TEXT_SEARCH_SCOPE,
} from "./constants";
import { createGooglePlacesHotelProvider } from "./google-places";
import type { GoogleAccessTokenProvider, HotelTransport } from "./types";

function accessTokenProvider() {
  return {
    getAccessToken: vi.fn().mockResolvedValue("SHORT_LIVED_TOKEN"),
  } satisfies GoogleAccessTokenProvider;
}

function hotel(overrides: Record<string, unknown> = {}) {
  return {
    id: "ChIJTestHotel123",
    displayName: { text: "فندق الاختبار", languageCode: "ar" },
    formattedAddress: "الرياض، المملكة العربية السعودية",
    location: { latitude: 24.7136, longitude: 46.6753 },
    primaryType: "hotel",
    businessStatus: "OPERATIONAL",
    googleMapsUri: "https://maps.google.com/?cid=123",
    rating: 5,
    userRatingCount: 999,
    rawPrivateField: "DO_NOT_EXPOSE",
    ...overrides,
  };
}

describe("Google Places hotel provider", () => {
  it("sends an Arabic Text Search request with the approved field mask and allow-lists output", async () => {
    const tokenProvider = accessTokenProvider();
    const transport = vi.fn<HotelTransport>().mockResolvedValue(
      Response.json({ places: [hotel()] })
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: tokenProvider,
      transport,
    });

    const results = await provider.search({
      query: "فندق الاختبار",
      city: "الرياض",
      locale: "ar",
    });

    expect(tokenProvider.getAccessToken).toHaveBeenCalledWith(GOOGLE_TEXT_SEARCH_SCOPE);
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      authorization: "Bearer SHORT_LIVED_TOKEN",
      "x-goog-fieldmask": GOOGLE_TEXT_SEARCH_FIELD_MASK,
    });
    expect(init.headers).not.toHaveProperty("x-goog-api-key");
    expect(JSON.parse(String(init.body))).toEqual({
      textQuery: "فندق الاختبار الرياض",
      languageCode: "ar",
      pageSize: 5,
    });
    expect(results).toEqual([
      {
        placeId: "ChIJTestHotel123",
        requestedLocaleName: "فندق الاختبار",
        formattedAddress: "الرياض، المملكة العربية السعودية",
        latitude: 24.7136,
        longitude: 46.6753,
        primaryType: "hotel",
        businessStatus: "OPERATIONAL",
        googleMapsUri: "https://maps.google.com/?cid=123",
        source: "google_places",
      },
    ]);
    expect(JSON.stringify(results)).not.toContain("rating");
    expect(JSON.stringify(results)).not.toContain("DO_NOT_EXPOSE");
  });

  it("preserves provider order, returns ambiguity, and removes non-hotel places", async () => {
    const transport = vi.fn<HotelTransport>().mockResolvedValue(
      Response.json({
        places: [
          hotel({ id: "ChIJFirstHotel", displayName: { text: "First" } }),
          hotel({ id: "ChIJRestaurant", primaryType: "restaurant" }),
          hotel({ id: "ChIJSecondHotel", displayName: { text: "Second" } }),
        ],
      })
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport,
    });

    const results = await provider.search({ query: "Test Hotel", locale: "en" });
    expect(results.map(({ placeId }) => placeId)).toEqual([
      "ChIJFirstHotel",
      "ChIJSecondHotel",
    ]);
  });

  it("returns a real empty result without creating preview data", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(Response.json({ places: [] })),
    });
    await expect(provider.search({ query: "Missing Hotel", locale: "en" })).resolves.toEqual([]);
  });

  it("preserves a source-backed closed status", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({ places: [hotel({ businessStatus: "CLOSED_PERMANENTLY" })] })
      ),
    });
    const [result] = await provider.search({ query: "Closed Hotel", locale: "en" });
    expect(result.businessStatus).toBe("CLOSED_PERMANENTLY");
  });

  it("looks up only the selected Place ID using the details scope and minimal field mask", async () => {
    const tokenProvider = accessTokenProvider();
    const transport = vi.fn<HotelTransport>().mockResolvedValue(
      Response.json({
        id: "ChIJTestHotel123",
        displayName: { text: "Test Hotel", languageCode: "en" },
      })
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: tokenProvider,
      transport,
    });

    await expect(provider.getLocalizedName("ChIJTestHotel123", "en")).resolves.toEqual({
      text: "Test Hotel",
      languageCode: "en",
    });
    expect(tokenProvider.getAccessToken).toHaveBeenCalledWith(GOOGLE_PLACE_DETAILS_SCOPE);
    const [url, init] = transport.mock.calls[0];
    expect(String(url)).toContain("/v1/places/ChIJTestHotel123?languageCode=en");
    expect(init.headers).toMatchObject({
      "x-goog-fieldmask": GOOGLE_PLACE_DETAILS_FIELD_MASK,
    });
  });

  it("preserves a valid Arabic source language code", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({
          id: "ChIJTestHotel123",
          displayName: { text: "فندق الاختبار", languageCode: "ar" },
        })
      ),
    });

    await expect(provider.getLocalizedName("ChIJTestHotel123", "ar")).resolves.toEqual({
      text: "فندق الاختبار",
      languageCode: "ar",
    });
  });

  it("preserves a valid source fallback language for the caller to reject", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({
          id: "ChIJTestHotel123",
          displayName: { text: "فندق الاختبار", languageCode: "ar" },
        })
      ),
    });

    await expect(provider.getLocalizedName("ChIJTestHotel123", "en")).resolves.toEqual({
      text: "فندق الاختبار",
      languageCode: "ar",
    });
  });

  it("does not invent a missing alternate-locale name", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({ id: "ChIJTestHotel123" })
      ),
    });
    await expect(provider.getLocalizedName("ChIJTestHotel123", "en")).resolves.toBeNull();
  });

  it.each([
    { text: "Test Hotel" },
    { text: "Test Hotel", languageCode: "fr" },
    { text: "Test Hotel", languageCode: "en\u0000" },
  ])("rejects a missing, unknown, or malformed source language code %#", async (displayName) => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({ id: "ChIJTestHotel123", displayName })
      ),
    });
    await expect(provider.getLocalizedName("ChIJTestHotel123", "en")).resolves.toBeNull();
  });

  it("rejects Place Details for a different Place ID", async () => {
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({ id: "ChIJDifferentHotel", displayName: { text: "Wrong Hotel" } })
      ),
    });
    await expect(
      provider.getLocalizedName("ChIJTestHotel123", "en")
    ).rejects.toMatchObject({ code: "PROVIDER_RESPONSE_INVALID" });
  });

  it.each([
    [401, "PROVIDER_AUTH"],
    [403, "PROVIDER_AUTH"],
    [429, "PROVIDER_QUOTA"],
    [500, "PROVIDER_UNAVAILABLE"],
  ])("maps HTTP %i to %s without parsing the upstream error body", async (status, code) => {
    const marker = "RAW_PROVIDER_PRIVATE_BODY";
    const transport = vi.fn<HotelTransport>().mockResolvedValue(
      new Response(marker, { status })
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport,
    });

    const failure = provider.search({ query: "Test Hotel", locale: "en" });
    await expect(failure).rejects.toMatchObject({ code });
    await expect(failure).rejects.not.toThrow(marker);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid JSON and unsafe source links", async () => {
    const invalidJson = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        new Response("not-json", { headers: { "content-type": "application/json" } })
      ),
    });
    await expect(
      invalidJson.search({ query: "Test Hotel", locale: "en" })
    ).rejects.toMatchObject({ code: "PROVIDER_RESPONSE_INVALID" });

    const unsafeLink = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport: vi.fn<HotelTransport>().mockResolvedValue(
        Response.json({ places: [hotel({ googleMapsUri: "https://evil.example/hotel" })] })
      ),
    });
    await expect(
      unsafeLink.search({ query: "Test Hotel", locale: "en" })
    ).rejects.toMatchObject({ code: "PROVIDER_RESPONSE_INVALID" });
  });

  it("normalizes network failures and performs no automatic retry", async () => {
    const transport = vi.fn<HotelTransport>().mockRejectedValue(
      new Error("NETWORK_PRIVATE_ERROR")
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport,
    });

    const failure = provider.search({ query: "Test Hotel", locale: "en" });
    await expect(failure).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(failure).rejects.not.toThrow("NETWORK_PRIVATE_ERROR");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("aborts a timed-out request and performs no automatic retry", async () => {
    const transport = vi.fn<HotelTransport>().mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        })
    );
    const provider = createGooglePlacesHotelProvider({
      accessTokenProvider: accessTokenProvider(),
      transport,
      timeoutMs: 1,
    });

    await expect(
      provider.search({ query: "Test Hotel", locale: "en" })
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
