import { describe, expect, it } from "vitest";
import { getReviewedGuides } from "./guides";
import { GUIDE_SEO, INSIGHT_SEO, type SeoCopy } from "./seo-copy";
import { getPublishedInsights } from "./travel-insights";

/** The suffix the root layout's title template appends. */
const SUFFIX = " | سافر بوعي";

function expectSearchFit(copy: SeoCopy | undefined, slug: string) {
  expect(copy, slug).toBeDefined();
  expect((copy!.title + SUFFIX).length, `${slug} title`).toBeLessThanOrEqual(60);
  expect(copy!.description.length, `${slug} description`).toBeGreaterThanOrEqual(120);
  expect(copy!.description.length, `${slug} description`).toBeLessThanOrEqual(155);
}

describe("search titles and descriptions", () => {
  it("covers every reviewed guide within the search length limits", () => {
    for (const { slug } of getReviewedGuides()) expectSearchFit(GUIDE_SEO[slug], slug);
  });

  it("covers every published insight within the search length limits", () => {
    for (const { slug } of getPublishedInsights()) expectSearchFit(INSIGHT_SEO[slug], slug);
  });

  it("has no entries for unpublished or unknown pages", () => {
    const guides = new Set(getReviewedGuides().map(({ slug }) => slug));
    const insights = new Set(getPublishedInsights().map(({ slug }) => slug));
    expect(Object.keys(GUIDE_SEO).filter((slug) => !guides.has(slug))).toEqual([]);
    expect(Object.keys(INSIGHT_SEO).filter((slug) => !insights.has(slug))).toEqual([]);
  });

  it("keeps titles unique", () => {
    const titles = [...Object.values(GUIDE_SEO), ...Object.values(INSIGHT_SEO)].map(({ title }) => title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
