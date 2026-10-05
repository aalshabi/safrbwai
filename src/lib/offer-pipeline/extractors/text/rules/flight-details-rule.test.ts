import { describe, expect, it } from "vitest";
import { flightDetailsRule } from "./flight-details-rule";

describe("flightDetailsRule", () => {
  it("extracts Arabic transit duration and a singular named stop", () => {
    const facts = flightDetailsRule.apply("تتوقف في الدوحة لمدة ٧ ساعات").facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 420 });
    expect(facts.stopCount?.value).toBe(1);
  });

  it("extracts English duration, explicit stop count and airport change", () => {
    const facts = flightDetailsRule.apply(
      "The route has 2 stops and a 90 minute transit, with an airport change."
    ).facts;
    expect(facts.transitDuration?.value).toEqual({ minutes: 90 });
    expect(facts.stopCount?.value).toBe(2);
    expect(facts.airportChange?.value).toBe(true);
  });

  it("preserves an explicit no-airport-change statement", () => {
    expect(
      flightDetailsRule.apply("One stop in Doha, with no airport change.").facts.airportChange?.value
    ).toBe(false);
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
