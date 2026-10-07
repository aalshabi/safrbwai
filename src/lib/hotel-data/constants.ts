export const HOTEL_SEARCH_SCHEMA_VERSION = "hotel-search.v1" as const;
export const HOTEL_NAME_SCHEMA_VERSION = "hotel-name.v1" as const;
export const HOTEL_SEARCH_MAX_BODY_BYTES = 1_024;
export const HOTEL_NAME_MAX_BODY_BYTES = 512;
export const HOTEL_QUERY_MIN_CHARS = 2;
export const HOTEL_QUERY_MAX_CHARS = 120;
export const HOTEL_CITY_MAX_CHARS = 80;
export const HOTEL_PLACE_ID_MAX_CHARS = 256;
export const HOTEL_SEARCH_MAX_RESULTS = 5;
export const GOOGLE_PLACES_TIMEOUT_MS = 3_500;

export const GOOGLE_TEXT_SEARCH_ENDPOINT =
  "https://places.googleapis.com/v1/places:searchText";
export const GOOGLE_PLACE_DETAILS_ENDPOINT =
  "https://places.googleapis.com/v1/places";

export const GOOGLE_TEXT_SEARCH_SCOPE =
  "https://www.googleapis.com/auth/maps-platform.places.textsearch";
export const GOOGLE_PLACE_DETAILS_SCOPE =
  "https://www.googleapis.com/auth/maps-platform.places.details";

export const GOOGLE_TEXT_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.businessStatus",
  "places.googleMapsUri",
].join(",");

export const GOOGLE_PLACE_DETAILS_FIELD_MASK = "id,displayName";

export const APPROVED_GOOGLE_PLACES_SCOPES = new Set([
  GOOGLE_TEXT_SEARCH_SCOPE,
  GOOGLE_PLACE_DETAILS_SCOPE,
]);

export const GOOGLE_HOTEL_PRIMARY_TYPES = new Set([
  "bed_and_breakfast",
  "budget_japanese_inn",
  "extended_stay_hotel",
  "guest_house",
  "hostel",
  "hotel",
  "inn",
  "japanese_inn",
  "lodging",
  "motel",
  "resort_hotel",
]);
