import {
  GOOGLE_HOTEL_PRIMARY_TYPES,
  GOOGLE_PLACE_DETAILS_ENDPOINT,
  GOOGLE_PLACE_DETAILS_FIELD_MASK,
  GOOGLE_PLACE_DETAILS_SCOPE,
  GOOGLE_PLACES_TIMEOUT_MS,
  GOOGLE_TEXT_SEARCH_ENDPOINT,
  GOOGLE_TEXT_SEARCH_FIELD_MASK,
  GOOGLE_TEXT_SEARCH_SCOPE,
  HOTEL_SEARCH_MAX_RESULTS,
} from "./constants";
import { createVercelGoogleAccessTokenProvider } from "./auth";
import { readGoogleOidcConfig } from "./config";
import { HotelProviderError } from "./errors";
import type {
  GoogleAccessTokenProvider,
  HotelBusinessStatus,
  HotelDataProvider,
  HotelLocale,
  HotelSearchInput,
  HotelTransport,
  SourcedLocalizedHotelName,
  SourcedHotel,
} from "./types";

type GooglePlacesProviderOptions = Readonly<{
  accessTokenProvider: GoogleAccessTokenProvider;
  transport?: HotelTransport;
  timeoutMs?: number;
}>;

const BUSINESS_STATUSES = new Set<HotelBusinessStatus>([
  "OPERATIONAL",
  "CLOSED_TEMPORARILY",
  "CLOSED_PERMANENTLY",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.normalize("NFKC").trim();
  if (!normalized || normalized.length > max || /[\u0000-\u001F\u007F-\u009F]/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function safePlaceId(value: unknown): string | undefined {
  const id = safeString(value, 256);
  return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined;
}

function safeGoogleMapsUri(value: unknown): string | undefined {
  const uri = safeString(value, 2_048);
  if (!uri) return undefined;
  try {
    const url = new URL(uri);
    const allowedHost =
      url.hostname === "maps.google.com" ||
      (url.hostname === "www.google.com" && url.pathname.startsWith("/maps"));
    return url.protocol === "https:" && allowedHost ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function mapPlace(raw: unknown): SourcedHotel | null {
  if (!isRecord(raw)) throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");

  const placeId = safePlaceId(raw.id);
  const primaryType = safeString(raw.primaryType, 100);
  const displayName = isRecord(raw.displayName)
    ? safeString(raw.displayName.text, 300)
    : undefined;

  if (!placeId || !primaryType || !displayName) {
    throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  }
  if (!GOOGLE_HOTEL_PRIMARY_TYPES.has(primaryType)) return null;

  const formattedAddress = safeString(raw.formattedAddress, 500);
  const googleMapsUri = raw.googleMapsUri === undefined
    ? undefined
    : safeGoogleMapsUri(raw.googleMapsUri);
  if (raw.googleMapsUri !== undefined && !googleMapsUri) {
    throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  }

  let latitude: number | undefined;
  let longitude: number | undefined;
  if (raw.location !== undefined) {
    if (!isRecord(raw.location)) {
      throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
    }
    const lat = raw.location.latitude;
    const lng = raw.location.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
    }
    latitude = lat;
    longitude = lng;
  }

  const businessStatus = BUSINESS_STATUSES.has(raw.businessStatus as HotelBusinessStatus)
    ? (raw.businessStatus as HotelBusinessStatus)
    : undefined;

  return {
    placeId,
    requestedLocaleName: displayName,
    primaryType,
    source: "google_places",
    ...(formattedAddress ? { formattedAddress } : {}),
    ...(latitude !== undefined && longitude !== undefined ? { latitude, longitude } : {}),
    ...(businessStatus ? { businessStatus } : {}),
    ...(googleMapsUri ? { googleMapsUri } : {}),
  };
}

function mapSearchResponse(raw: unknown): readonly SourcedHotel[] {
  if (!isRecord(raw) || (raw.places !== undefined && !Array.isArray(raw.places))) {
    throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  }
  const places = raw.places ?? [];
  return (places as unknown[])
    .map(mapPlace)
    .filter((place): place is SourcedHotel => place !== null)
    .slice(0, HOTEL_SEARCH_MAX_RESULTS);
}

function mapDetailsName(
  raw: unknown,
  expectedPlaceId: string
): SourcedLocalizedHotelName | null {
  if (!isRecord(raw)) throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  const placeId = safePlaceId(raw.id);
  if (!placeId || placeId !== expectedPlaceId) {
    throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  }
  if (raw.displayName === undefined) return null;
  if (!isRecord(raw.displayName)) {
    throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
  }
  const text = safeString(raw.displayName.text, 300);
  const languageCode = safeString(raw.displayName.languageCode, 16)?.toLowerCase();
  if (!text || (languageCode !== "ar" && languageCode !== "en")) return null;
  return { text, languageCode };
}

function mapHttpError(status: number): HotelProviderError {
  if (status === 401 || status === 403) return new HotelProviderError("PROVIDER_AUTH");
  if (status === 429) return new HotelProviderError("PROVIDER_QUOTA");
  return new HotelProviderError("PROVIDER_UNAVAILABLE");
}

export function createGooglePlacesHotelProvider({
  accessTokenProvider,
  transport = fetch,
  timeoutMs = GOOGLE_PLACES_TIMEOUT_MS,
}: GooglePlacesProviderOptions): HotelDataProvider {
  async function requestJson(
    url: string,
    init: RequestInit,
    scope: string,
    fieldMask: string
  ): Promise<unknown> {
    let token: string;
    try {
      token = await accessTokenProvider.getAccessToken(scope);
    } catch (error) {
      if (error instanceof HotelProviderError) throw error;
      throw new HotelProviderError("PROVIDER_AUTH");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await transport(url, {
        ...init,
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-goog-fieldmask": fieldMask,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw mapHttpError(response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new HotelProviderError("PROVIDER_RESPONSE_INVALID");
      }
    } catch (error) {
      if (error instanceof HotelProviderError) throw error;
      throw new HotelProviderError("PROVIDER_UNAVAILABLE");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async search(input: HotelSearchInput): Promise<readonly SourcedHotel[]> {
      const raw = await requestJson(
        GOOGLE_TEXT_SEARCH_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify({
            textQuery: input.city ? `${input.query} ${input.city}` : input.query,
            languageCode: input.locale,
            pageSize: HOTEL_SEARCH_MAX_RESULTS,
          }),
        },
        GOOGLE_TEXT_SEARCH_SCOPE,
        GOOGLE_TEXT_SEARCH_FIELD_MASK
      );
      return mapSearchResponse(raw);
    },

    async getLocalizedName(
      placeId: string,
      locale: HotelLocale
    ): Promise<SourcedLocalizedHotelName | null> {
      const safeId = safePlaceId(placeId);
      if (!safeId) throw new HotelProviderError("PROVIDER_CONFIG");
      const url = new URL(`${GOOGLE_PLACE_DETAILS_ENDPOINT}/${encodeURIComponent(safeId)}`);
      url.searchParams.set("languageCode", locale);
      const raw = await requestJson(
        url.toString(),
        { method: "GET" },
        GOOGLE_PLACE_DETAILS_SCOPE,
        GOOGLE_PLACE_DETAILS_FIELD_MASK
      );
      return mapDetailsName(raw, safeId);
    },
  };
}

export function createConfiguredGooglePlacesHotelProvider(): HotelDataProvider {
  const config = readGoogleOidcConfig();
  return createGooglePlacesHotelProvider({
    accessTokenProvider: createVercelGoogleAccessTokenProvider(config),
  });
}
