import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";
import { metadata as compareMetadata } from "./compare-hotels/page";
import { metadata as knowledgeMetadata } from "./knowledge/page";
import { metadata as destinationMetadata } from "./analyze-destination/page";
import { metadata as authMetadata } from "./auth/page";
import { isIndexable } from "@/lib/seo";
import { getReviewedGuides } from "@/lib/guides";
import { getPublishedInsights } from "@/lib/travel-insights";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public indexing", () => {
  it("blocks only APIs, so crawlers can read the private pages' noindex", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(["/api/"]);
    expect(result.sitemap).toMatch(/^https:\/\/.+\/sitemap\.xml$/);
  });

  it("lists only public, working pages in the sitemap, on an https origin", () => {
    const urls = sitemap().map(({ url }) => new URL(url));
    const paths = urls.map(({ pathname }) => pathname);
    expect(urls.every(({ protocol }) => protocol === "https:")).toBe(true);
    expect(paths).toContain("/analyze-offer");
    expect(paths).toContain("/analyze-hotel");
    expect(paths).toContain("/insights");
    expect(paths).toContain("/insights/verify-hotel-booking-site");
    expect(paths).toContain("/privacy");
    expect(paths).toContain("/terms");
    for (const hidden of ["/admin", "/auth", "/dashboard", "/compare-hotels", "/analyze-destination", "/knowledge"]) {
      expect(paths).not.toContain(hidden);
    }
  });

  it("dates guides and insights by their last review and leaves the homepage entry as before", () => {
    const entries = new Map(sitemap().map((entry) => [new URL(entry.url).pathname, entry]));
    for (const guide of getReviewedGuides()) {
      expect(entries.get(`/guides/${guide.slug}`)?.lastModified).toBe(guide.reviewedAt);
    }
    for (const insight of getPublishedInsights()) {
      expect(entries.get(`/insights/${insight.slug}`)?.lastModified).toBe(insight.reviewedAt);
    }
    const home = entries.get("/");
    expect(home?.lastModified).toBeInstanceOf(Date);
    expect(home).toMatchObject({ changeFrequency: "weekly", priority: 1 });
  });

  it("disallows everything and lists nothing on a Preview deployment", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_TARGET_ENV", "preview");
    expect(isIndexable()).toBe(false);
    const rules = robots().rules;
    expect(Array.isArray(rules) ? rules[0].disallow : rules.disallow).toBe("/");
    expect(sitemap()).toEqual([]);
  });

  it("is indexable in Production", () => {
    expect(isIndexable({ VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" })).toBe(true);
  });

  it("keeps preview tools and private pages out of the index", () => {
    for (const metadata of [compareMetadata, knowledgeMetadata, destinationMetadata]) {
      expect(metadata.robots).toEqual({ index: false, follow: true });
    }
    expect(authMetadata.robots).toEqual({ index: false, follow: false });
  });
});
