import { describe, expect, it } from "vitest";
import { getReviewedGuides } from "./guides";

describe("reviewed travel guides", () => {
  it("publishes exactly three focused guides with visible review dates and official sources", () => {
    const guides = getReviewedGuides();
    expect(guides).toHaveLength(3);
    for (const guide of guides) {
      expect(guide.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(guide.sources.length).toBeGreaterThan(0);
      expect(guide.sources.every((source) => source.href.startsWith("https://"))).toBe(true);
      expect(guide.sections.length).toBeGreaterThan(0);
    }
  });

  it("uses only the reviewed guides as public content candidates", () => {
    expect(getReviewedGuides().every((guide) => guide.status === "reviewed")).toBe(true);
  });
});
