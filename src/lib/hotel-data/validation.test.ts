import { describe, expect, it } from "vitest";
import { validateHotelNameInput, validateHotelSearchInput } from "./validation";

describe("hotel-search input validation", () => {
  it("normalizes an Arabic hotel name and optional city", () => {
    expect(
      validateHotelSearchInput({
        query: "  فندق   الاختبار  ",
        city: "  الرياض ",
        locale: "ar",
      })
    ).toEqual({
      ok: true,
      value: { query: "فندق الاختبار", city: "الرياض", locale: "ar" },
    });
  });

  it("accepts an English query without a city", () => {
    expect(validateHotelSearchInput({ query: "Test Hotel", locale: "en" })).toEqual({
      ok: true,
      value: { query: "Test Hotel", locale: "en" },
    });
  });

  it.each([
    null,
    [],
    {},
    { query: "x", locale: "en" },
    { query: "Test Hotel", city: "", locale: "en" },
    { query: "Test Hotel", locale: "fr" },
    { query: "Test Hotel", locale: "en", extra: true },
    { query: "https://example.com/hotel", locale: "en" },
    { query: "secret=PRIVATE", locale: "en" },
    { query: "Hotel 4111 1111 1111 1111", locale: "en" },
    { query: "Hotel\u0000Name", locale: "en" },
  ])("rejects invalid or sensitive-looking input %#", (input) => {
    expect(validateHotelSearchInput(input)).toEqual({ ok: false, code: "BAD_REQUEST" });
  });

  it("does not mutate the input object", () => {
    const input = Object.freeze({ query: "  Test Hotel  ", locale: "en" as const });
    expect(validateHotelSearchInput(input).ok).toBe(true);
    expect(input.query).toBe("  Test Hotel  ");
  });
});

describe("hotel-name input validation", () => {
  it("accepts an allow-listed Place ID and locale", () => {
    expect(
      validateHotelNameInput({ placeId: "  ChIJTest_Hotel-123  ", locale: "ar" })
    ).toEqual({
      ok: true,
      value: { placeId: "ChIJTest_Hotel-123", locale: "ar" },
    });
  });

  it.each([
    null,
    {},
    { placeId: "", locale: "en" },
    { placeId: "ChIJ/Test", locale: "en" },
    { placeId: "ChIJTest", locale: "fr" },
    { placeId: "ChIJTest", locale: "en", query: "private" },
    { placeId: "x".repeat(257), locale: "en" },
  ])("rejects invalid alternate-name input %#", (input) => {
    expect(validateHotelNameInput(input)).toEqual({ ok: false, code: "BAD_REQUEST" });
  });
});
