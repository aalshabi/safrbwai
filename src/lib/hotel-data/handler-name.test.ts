import { afterEach, describe, expect, it, vi } from "vitest";
import { createInMemoryRateLimiter } from "@/lib/offer-pipeline/api/rate-limit";
import { HOTEL_NAME_SCHEMA_VERSION } from "./constants";
import { HotelProviderError } from "./errors";
import { createHotelNameHandler } from "./handler";
import type { HotelDataProvider } from "./types";

const URL = "http://localhost/api/hotels/name";

function request(body: unknown, ip = "203.0.113.20") {
  return new Request(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function provider(
  getLocalizedName = vi.fn().mockResolvedValue({
    text: "Test Hotel",
    languageCode: "en",
  })
): HotelDataProvider {
  return {
    search: vi.fn().mockResolvedValue([]),
    getLocalizedName,
  };
}

function setup(options: {
  enabled?: boolean;
  providerFactory?: () => HotelDataProvider;
  max?: number;
} = {}) {
  const source = provider();
  const providerFactory = options.providerFactory ?? vi.fn(() => source);
  return {
    source,
    providerFactory,
    handler: createHotelNameHandler({
      enabled: options.enabled ?? true,
      providerFactory,
      rateLimiter: createInMemoryRateLimiter({
        max: options.max ?? 3,
        windowMs: 60_000,
      }),
    }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe("POST /api/hotels/name", () => {
  it("fails closed before reading input or constructing a provider", async () => {
    const providerFactory = vi.fn(() => provider());
    const { handler } = setup({ enabled: false, providerFactory });
    const response = await handler(
      request({ placeId: "PRIVATE_PLACE_ID", locale: "ar" })
    );

    expect(response.status).toBe(503);
    expect(providerFactory).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.error.code).toBe("HOTEL_SEARCH_DISABLED");
    expect(JSON.stringify(body)).not.toContain("PRIVATE_PLACE_ID");
  });

  it("returns only the selected source ID and source-provided localized name", async () => {
    const getLocalizedName = vi.fn().mockResolvedValue({
      text: "فندق الاختبار",
      languageCode: "ar",
    });
    const source = provider(getLocalizedName);
    const { handler } = setup({ providerFactory: () => source });
    const response = await handler(
      request({ placeId: "ChIJTestHotel123", locale: "ar" })
    );

    expect(response.status).toBe(200);
    expect(getLocalizedName).toHaveBeenCalledWith("ChIJTestHotel123", "ar");
    expect(await response.json()).toEqual({
      ok: true,
      schemaVersion: HOTEL_NAME_SCHEMA_VERSION,
      requestId: expect.any(String),
      data: {
        source: "google_places",
        placeId: "ChIJTestHotel123",
        localizedName: { text: "فندق الاختبار", languageCode: "ar" },
      },
    });
  });

  it.each([
    ["en", { text: "فندق الاختبار", languageCode: "ar" }],
    ["ar", { text: "English fallback", languageCode: "en" }],
  ] as const)(
    "returns null when the source name for %s is in a fallback language",
    async (locale, sourced) => {
      const source = provider(vi.fn().mockResolvedValue(sourced));
      const { handler } = setup({ providerFactory: () => source });
      const response = await handler(request({ placeId: "ChIJTestHotel123", locale }));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.localizedName).toBeNull();
      expect(JSON.stringify(body)).not.toContain(sourced.text);
    }
  );

  it("preserves a missing alternate name as null without inventing one", async () => {
    const source = provider(vi.fn().mockResolvedValue(null));
    const { handler } = setup({ providerFactory: () => source });
    const response = await handler(
      request({ placeId: "ChIJTestHotel123", locale: "en" })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data.localizedName).toBeNull();
  });

  it("fails closed when a provider returns a malformed localized name", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const source = provider(
      vi.fn().mockResolvedValue({ text: "Unsafe\u0000Name", languageCode: "en" })
    );
    const { handler } = setup({ providerFactory: () => source });
    const response = await handler(
      request({ placeId: "ChIJTestHotel123", locale: "ar" })
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("Unsafe");
    expect(log.mock.calls.flat().join(" ")).not.toContain("Unsafe");
  });

  it("fails closed when a provider returns an unsupported language code", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const source = provider(
      vi.fn().mockResolvedValue({ text: "Hôtel test", languageCode: "fr" })
    );
    const { handler } = setup({ providerFactory: () => source });
    const response = await handler(
      request({ placeId: "ChIJTestHotel123", locale: "en" })
    );

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("Hôtel test");
    expect(log.mock.calls.flat().join(" ")).not.toContain("Hôtel test");
  });

  it("rejects invalid input before provider construction", async () => {
    const providerFactory = vi.fn(() => provider());
    const { handler } = setup({ providerFactory });
    const response = await handler(
      request({ placeId: "../../private", locale: "en", extra: true })
    );
    expect(response.status).toBe(400);
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("rate-limits selected-name requests with Retry-After", async () => {
    const { handler } = setup({ max: 1 });
    const payload = { placeId: "ChIJTestHotel123", locale: "en" };
    expect((await handler(request(payload))).status).toBe(200);
    const blocked = await handler(request(payload));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect((await blocked.json()).error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("maps provider failures to a safe response without raw diagnostics", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const source = provider(
      vi.fn().mockRejectedValue(new HotelProviderError("PROVIDER_RESPONSE_INVALID"))
    );
    const { handler } = setup({ providerFactory: () => source });
    const response = await handler(
      request({ placeId: "ChIJPrivateHotel", locale: "ar" })
    );

    expect(response.status).toBe(503);
    const publicResponse = JSON.stringify(await response.json());
    const serverLog = log.mock.calls.flat().join(" ");
    expect(publicResponse).not.toContain("ChIJPrivateHotel");
    expect(publicResponse).not.toContain("PROVIDER_RESPONSE_INVALID");
    expect(publicResponse).not.toContain("googleapis.com");
    expect(serverLog).not.toContain("ChIJPrivateHotel");
    expect(serverLog).not.toContain("googleapis.com");
  });
});
