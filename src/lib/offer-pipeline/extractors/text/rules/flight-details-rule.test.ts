import { describe, expect, it } from "vitest";
import { flightDetailsRule } from "./flight-details-rule";

describe("flightDetailsRule", () => {
  it("extracts Arabic transit duration and a singular named stop", () => {
    const facts = flightDetailsRule.apply("رحلة الذهاب تتوقف في الدوحة لمدة ٧ ساعات").facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 420 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("extracts English duration, explicit stop count and airport change", () => {
    const facts = flightDetailsRule.apply(
      "The flight route has 2 stops and a 90 minute transit, with an airport change."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 90 });
    expect(facts.stopCount?.value).toBe(2);
    expect(facts.airportChange?.value).toBe(true);
  });

  it("preserves an explicit no-airport-change statement", () => {
    expect(
      flightDetailsRule.apply("The flight has one stop in Doha, with no airport change.").facts.airportChange?.value
    ).toBe(false);
  });

  it("does not turn English ground-transport stops into flight facts", () => {
    for (const text of [
      "Airport shuttle stops in the hotel for 2 hours.",
      "The bus stops in Doha for 2 hours.",
      "The sightseeing tour has 2 stops.",
    ]) {
      const facts = flightDetailsRule.apply(text).facts;
      expect(facts.transitDuration).toBeUndefined();
      expect(facts.stopCount).toBeUndefined();
    }
  });

  it("does not turn Arabic ground-transport stops into flight facts", () => {
    for (const text of [
      "تتوقف الحافلة في الدوحة لمدة 2 ساعات.",
      "خدمة النقل بها 2 توقفات قبل الفندق.",
      "جولة سياحية بها 2 توقفات.",
    ]) {
      const facts = flightDetailsRule.apply(text).facts;
      expect(facts.transitDuration).toBeUndefined();
      expect(facts.stopCount).toBeUndefined();
    }
  });

  it("keeps flight-stop facts when ground transport is mentioned in a separate clause", () => {
    const facts = flightDetailsRule.apply(
      "The flight has 1 stop in Doha for 2 hours, and airport shuttle is included."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 120 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("keeps English flight-stop facts when a ground-transfer inclusion follows in the same clause", () => {
    const facts = flightDetailsRule.apply(
      "The outbound flight stops in Doha for 3 hours and airport shuttle is included."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 180 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("keeps Arabic flight-stop facts when a ground-transfer inclusion follows in the same clause", () => {
    const facts = flightDetailsRule.apply(
      "رحلة الذهاب تتوقف في الدوحة لمدة 3 ساعات وخدمة النقل من المطار مشمولة."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 180 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("uses the nearest English subject when flights and ground stops share a clause", () => {
    for (const text of [
      "Flights are included and the airport shuttle stops at the hotel for 2 hours.",
      "The offer includes flights and the bus stops in Doha for 2 hours.",
    ]) {
      const facts = flightDetailsRule.apply(text).facts;
      expect(facts.transitDuration).toBeUndefined();
      expect(facts.stopCount).toBeUndefined();
    }
  });

  it("uses the nearest Arabic subject when flights and ground stops share a clause", () => {
    for (const text of [
      "الطيران مشمول وخدمة النقل من المطار تتوقف عند الفندق لمدة ساعتين.",
      "يشمل العرض الطيران وتتوقف الحافلة في الدوحة لمدة ساعتين.",
    ]) {
      const facts = flightDetailsRule.apply(text).facts;
      expect(facts.transitDuration).toBeUndefined();
      expect(facts.stopCount).toBeUndefined();
    }
  });

  it("continues past an earlier ground stop to a later explicit flight stop", () => {
    const facts = flightDetailsRule.apply(
      "The bus stops in the hotel for 2 hours. The flight stops in Doha for 3 hours."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 180 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("does not invent airport-change status when the offer says it is unstated", () => {
    expect(
      flightDetailsRule.apply("لا يذكر العرض إن كان هناك تغيير مطار").facts.airportChange
    ).toBeUndefined();
    expect(
      flightDetailsRule.apply("Airport change is not stated.").facts.airportChange
    ).toBeUndefined();
  });
});
