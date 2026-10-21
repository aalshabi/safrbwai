import { describe, expect, it } from "vitest";
import { getPublishedInsights } from "./travel-insights";

describe("published travel insights", () => {
  it("publishes the reviewed topics in priority order", () => {
    const insights = getPublishedInsights();
    expect(insights).toHaveLength(6);
    expect(insights.map(({ priority }) => priority)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(insights.every(({ status }) => status === "published")).toBe(true);
  });

  it("keeps visible dates, claim labels, and at least two sources per topic", () => {
    for (const insight of getPublishedInsights()) {
      expect(insight.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(insight.sections.length).toBeGreaterThanOrEqual(3);
      expect(insight.sections.every(({ claimType }) =>
        ["fact", "reported", "inference", "recommendation"].includes(claimType)
      )).toBe(true);
      expect(insight.sources.length).toBeGreaterThanOrEqual(2);
      expect(insight.sources.every(({ href }) => href.startsWith("https://"))).toBe(true);
      expect(insight.sources.every(({ publishedAt }) => publishedAt === undefined || /^\d{4}-\d{2}-\d{2}$/.test(publishedAt))).toBe(true);
    }
  });
});
