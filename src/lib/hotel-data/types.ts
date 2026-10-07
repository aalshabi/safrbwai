export type HotelLocale = "ar" | "en";

export type HotelBusinessStatus =
  | "OPERATIONAL"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY";

export type HotelSearchInput = Readonly<{
  query: string;
  city?: string;
  locale: HotelLocale;
}>;

export type HotelNameInput = Readonly<{
  placeId: string;
  locale: HotelLocale;
}>;

export type SourcedLocalizedHotelName = Readonly<{
  text: string;
  languageCode: HotelLocale;
}>;

export type SourcedHotel = Readonly<{
  placeId: string;
  requestedLocaleName: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  primaryType: string;
  businessStatus?: HotelBusinessStatus;
  googleMapsUri?: string;
  source: "google_places";
}>;

export type HotelApiErrorCode =
  | "HOTEL_SEARCH_DISABLED"
  | "BAD_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMIT_EXCEEDED"
  | "PROVIDER_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type HotelApiMessage = Readonly<{ ar: string; en: string }>;

export type HotelApiErrorResponse<SchemaVersion extends string> = Readonly<{
  ok: false;
  schemaVersion: SchemaVersion;
  requestId: string;
  error: Readonly<{ code: HotelApiErrorCode; message: HotelApiMessage }>;
}>;

export interface HotelDataProvider {
  search(input: HotelSearchInput): Promise<readonly SourcedHotel[]>;
  getLocalizedName(
    placeId: string,
    locale: HotelLocale
  ): Promise<SourcedLocalizedHotelName | null>;
}

export interface GoogleAccessTokenProvider {
  getAccessToken(scope: string): Promise<string>;
}

export type HotelProviderMethod = "text_search" | "place_details";

export type HotelTransport = (
  input: string | URL,
  init: RequestInit
) => Promise<Response>;
