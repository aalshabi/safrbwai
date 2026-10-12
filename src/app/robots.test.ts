import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("public indexing", () => {
  it("allows crawling of public pages and keeps private pages and APIs out", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(["/api/", "/admin", "/auth", "/dashboard"]);
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("lists only public, working pages in the sitemap", () => {
    const paths = sitemap().map(({ url }) => new URL(url).pathname);
    expect(paths).toContain("/analyze-offer");
    expect(paths).toContain("/analyze-hotel");
    expect(paths).toContain("/privacy");
    expect(paths).toContain("/terms");
    for (const hidden of ["/admin", "/auth", "/dashboard", "/compare-hotels", "/analyze-destination"]) {
      expect(paths).not.toContain(hidden);
    }
  });
});
