import { describe, expect, it } from "vitest";
import { getReviewedGuides } from "./guides";
import { getRelatedLinks, RELATED_CONTENT, type ContentRef } from "./related-content";
import { getPublishedInsights } from "./travel-insights";

const pages: ContentRef[] = [
  ...getReviewedGuides().map(({ slug }) => ({ kind: "guide" as const, slug })),
  ...getPublishedInsights().map(({ slug }) => ({ kind: "insight" as const, slug })),
];

describe("related content map", () => {
  it("gives every published guide and insight at least two working links", () => {
    for (const page of pages) {
      expect(getRelatedLinks(page).length, `${page.kind}:${page.slug}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("only points at published pages, never at itself, and never twice", () => {
    for (const [from, refs] of Object.entries(RELATED_CONTENT)) {
      const [kind, slug] = from.split(":") as [ContentRef["kind"], string];
      expect(getRelatedLinks({ kind, slug }), from).toHaveLength(refs.length);
      const targets = refs.map((ref) => `${ref.kind}:${ref.slug}`);
      expect(targets, from).not.toContain(from);
      expect(new Set(targets).size, from).toBe(targets.length);
    }
  });

  it("has no entries for pages that are not published", () => {
    const published = new Set(pages.map(({ kind, slug }) => `${kind}:${slug}`));
    expect(Object.keys(RELATED_CONTENT).filter((from) => !published.has(from))).toEqual([]);
  });

  it("links to the page's own URL scheme", () => {
    expect(getRelatedLinks({ kind: "guide", slug: "transit-and-baggage" }).map(({ href }) => href)).toEqual([
      "/guides/total-price-and-inclusions",
      "/insights/ai-trip-planning-human-review",
    ]);
  });
});
