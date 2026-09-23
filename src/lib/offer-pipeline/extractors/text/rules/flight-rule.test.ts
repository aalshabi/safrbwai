import { describe, it, expect } from "vitest";
import { flightRule } from "./flight-rule";

const included = (text: string) => flightRule.apply(text).facts.flight?.value;

describe("flightRule", () => {
  it("«تذاكر طيران ذهاب وعودة» — stating the trip shape asserts the ticket", () => {
    const r = flightRule.apply("تذاكر طيران ذهاب وعودة على الخطوط السعودية");
    expect(r.facts.flight?.value).toEqual({ included: true });
    expect(r.facts.flight?.confidenceType).toBe("exact");
    expect(r.facts.flight?.evidence.length).toBeGreaterThan(0);
  });

  it("«شامل/يشمل الطيران»", () => {
    expect(included("شامل الطيران والفندق")).toEqual({ included: true });
    expect(included("يشمل تذاكر الطيران")).toEqual({ included: true });
    expect(included("مع الطيران")).toEqual({ included: true });
  });

  it("«الطيران مشمول»", () => {
    expect(included("الطيران مشمول في السعر")).toEqual({ included: true });
    // NOT «التذاكر مشمولة» — a bare ticket word is not airfare; see below.
    expect(included("تذاكر الطيران مشمولة")).toEqual({ included: true });
  });

  it("English wordings", () => {
    expect(included("Includes return flights")).toEqual({ included: true });
    expect(included("Round-trip tickets from Riyadh")).toEqual({ included: true });
    expect(included("International flights are included")).toEqual({ included: true });
  });

  it("detects exclusion", () => {
    expect(included("الطيران غير مشمول")).toEqual({ included: false });
    expect(included("السعر بدون الطيران")).toEqual({ included: false });
    expect(included("Land only, flights not included")).toEqual({ included: false });
  });

  it("negation wins over a nearby inclusion phrase", () => {
    expect(included("شامل الفندق، الطيران غير مشمول")).toEqual({ included: false });
  });

  it("does NOT decide from a bare mention (adds a warning instead)", () => {
    const r = flightRule.apply("نرتب لك الطيران عند الطلب");
    expect(r.facts.flight).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });

  /**
   * An offer sells museum, event and train tickets too. Reading those as the
   * airfare would be a materially false claim about what the price covers.
   */
  it("a generic «تذاكر» with no aviation word is never a flight", () => {
    expect(flightRule.apply("يشمل تذاكر المتحف").facts.flight).toBeUndefined();
    expect(flightRule.apply("يشمل تذاكر دخول المعالم").facts.flight).toBeUndefined();
    expect(flightRule.apply("تذاكر الفعاليات غير مشمولة").facts.flight).toBeUndefined();
    expect(flightRule.apply("التذاكر مشمولة").facts.flight).toBeUndefined();
  });

  it("but a ticket qualified as aviation still counts", () => {
    expect(included("يشمل تذاكر الطيران")).toEqual({ included: true });
    expect(included("تذاكر الرحلة الجوية مشمولة")).toEqual({ included: true });
  });

  it("returns nothing when no flight is mentioned (no fabrication)", () => {
    const r = flightRule.apply("فندق ٥ نجوم لمدة ٣ ليالٍ");
    expect(r.facts).toEqual({});
    expect(r.warnings).toEqual([]);
  });
});
