import {
  HOTEL_CITY_MAX_CHARS,
  HOTEL_PLACE_ID_MAX_CHARS,
  HOTEL_QUERY_MAX_CHARS,
  HOTEL_QUERY_MIN_CHARS,
} from "./constants";
import type { HotelNameInput, HotelSearchInput } from "./types";

export type HotelInputValidation =
  | { ok: true; value: HotelSearchInput }
  | { ok: false; code: "BAD_REQUEST" };

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;
const URL_LIKE = /(?:https?:\/\/|www\.)/iu;
const SECRET_LIKE = /(?:api[\s_-]*key|password|secret|access[\s_-]*token)\s*[:=]/iu;
const PAYMENT_LIKE = /(?:\d[\s-]?){13,19}/u;
const ALLOWED_KEYS = new Set(["query", "city", "locale"]);
const NAME_ALLOWED_KEYS = new Set(["placeId", "locale"]);
const PLACE_ID = /^[A-Za-z0-9_-]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function isUnsafe(value: string): boolean {
  return (
    CONTROL_CHARACTERS.test(value) ||
    URL_LIKE.test(value) ||
    SECRET_LIKE.test(value) ||
    PAYMENT_LIKE.test(value)
  );
}

export function validateHotelSearchInput(raw: unknown): HotelInputValidation {
  if (!isPlainObject(raw)) return { ok: false, code: "BAD_REQUEST" };
  if (Object.keys(raw).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, code: "BAD_REQUEST" };
  }

  if (typeof raw.query !== "string") return { ok: false, code: "BAD_REQUEST" };
  if (raw.locale !== "ar" && raw.locale !== "en") {
    return { ok: false, code: "BAD_REQUEST" };
  }
  if (raw.city !== undefined && typeof raw.city !== "string") {
    return { ok: false, code: "BAD_REQUEST" };
  }

  const query = normalizeText(raw.query);
  const city = raw.city === undefined ? undefined : normalizeText(raw.city);

  if (
    query.length < HOTEL_QUERY_MIN_CHARS ||
    query.length > HOTEL_QUERY_MAX_CHARS ||
    isUnsafe(query)
  ) {
    return { ok: false, code: "BAD_REQUEST" };
  }

  if (
    city !== undefined &&
    (city.length === 0 || city.length > HOTEL_CITY_MAX_CHARS || isUnsafe(city))
  ) {
    return { ok: false, code: "BAD_REQUEST" };
  }

  return {
    ok: true,
    value: city ? { query, city, locale: raw.locale } : { query, locale: raw.locale },
  };
}

export type HotelNameValidation =
  | { ok: true; value: HotelNameInput }
  | { ok: false; code: "BAD_REQUEST" };

export function validateHotelNameInput(raw: unknown): HotelNameValidation {
  if (!isPlainObject(raw)) return { ok: false, code: "BAD_REQUEST" };
  if (Object.keys(raw).some((key) => !NAME_ALLOWED_KEYS.has(key))) {
    return { ok: false, code: "BAD_REQUEST" };
  }
  if (typeof raw.placeId !== "string") return { ok: false, code: "BAD_REQUEST" };
  if (raw.locale !== "ar" && raw.locale !== "en") {
    return { ok: false, code: "BAD_REQUEST" };
  }

  const placeId = raw.placeId.trim();
  if (
    placeId.length === 0 ||
    placeId.length > HOTEL_PLACE_ID_MAX_CHARS ||
    !PLACE_ID.test(placeId)
  ) {
    return { ok: false, code: "BAD_REQUEST" };
  }

  return { ok: true, value: { placeId, locale: raw.locale } };
}
