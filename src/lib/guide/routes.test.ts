import { describe, expect, it } from "vitest";
import { PRODUCT_CAPABILITIES, getCapability } from "@/lib/product/capabilities";
import { GUIDE_DEFINITIONS } from "./routes";
import { GUIDE_ROUTES, guideTargetSelector, isGuideRoute } from "./selectors";

describe("central guide definitions", () => {
  it("defines each supported route once and excludes legal and auth pages", () => {
    expect(Object.keys(GUIDE_DEFINITIONS)).toEqual(GUIDE_ROUTES);
    expect(isGuideRoute("/privacy")).toBe(false);
    expect(isGuideRoute("/terms")).toBe(false);
    expect(isGuideRoute("/auth")).toBe(false);
  });

  it("provides five home steps and eleven offer-analysis steps", () => {
    expect(GUIDE_DEFINITIONS["/"].steps).toHaveLength(5);
    expect(GUIDE_DEFINITIONS["/analyze-offer"].steps).toHaveLength(11);
  });

  it("keeps short, explicit tours for preview and disabled pages", () => {
    for (const route of ["/analyze-hotel", "/analyze-destination", "/compare-hotels", "/knowledge", "/dashboard"] as const) {
      expect(GUIDE_DEFINITIONS[route].steps).toHaveLength(2);
    }
  });

  it("uses matching Arabic and English structures", () => {
    for (const definition of Object.values(GUIDE_DEFINITIONS)) {
      expect(new Set(definition.steps.map(({ id }) => id)).size).toBe(definition.steps.length);
      for (const item of definition.steps) {
        expect(item.title.ar.trim().length).toBeGreaterThan(0);
        expect(item.title.en.trim().length).toBeGreaterThan(0);
        expect(item.body.ar.trim().length).toBeGreaterThan(0);
        expect(item.body.en.trim().length).toBeGreaterThan(0);
        expect(item.route).toBe(definition.route);
      }
    }
  });

  it("derives every declared capability from the current registry", () => {
    for (const definition of Object.values(GUIDE_DEFINITIONS)) {
      for (const item of definition.steps) {
        if (!item.capability) continue;
        expect(getCapability(item.capability)).toBe(PRODUCT_CAPABILITIES[item.capability]);
      }
    }
    expect(getCapability("textOfferAnalysis").status).toBe("enabled");
    expect(getCapability("hotelIdentityLookup").status).toBe("preview");
    expect(getCapability("hotelOfferReview").status).toBe("preview");
    expect(getCapability("destinationChecklist").status).toBe("preview");
    expect(getCapability("hotelComparison").status).toBe("preview");
    expect(getCapability("knowledgeLibrary").status).toBe("preview");
    expect(getCapability("localDashboard").status).toBe("disabled");
  });

  it("describes preview sections without fabricating results or live sources", () => {
    const previewText = ["/analyze-hotel", "/analyze-destination", "/compare-hotels", "/knowledge"]
      .flatMap((route) => GUIDE_DEFINITIONS[route as keyof typeof GUIDE_DEFINITIONS].steps)
      .flatMap(({ body }) => [body.ar, body.en])
      .join(" ");
    expect(previewText).not.toMatch(/4\.\d|five-star result|live rating|real-time weather result/i);
    expect(previewText).toContain("preview only");
  });

  it("uses stable selectors only for declared guide targets", () => {
    const targets = GUIDE_DEFINITIONS["/analyze-offer"].steps.flatMap(({ target }) => target ? [target] : []);
    expect(new Set(targets).size).toBe(10);
    for (const target of targets) {
      expect(guideTargetSelector(target)).toBe(`[data-guide-id="${target}"]`);
    }
  });

  it("links only the final home step to the working analyzer", () => {
    expect(GUIDE_DEFINITIONS["/"].steps.filter(({ href }) => href)).toEqual([
      expect.objectContaining({ id: "home-open-offer", href: "/analyze-offer" }),
    ]);
  });
});
