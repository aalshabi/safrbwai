import { describe, expect, it } from "vitest";
import { SOCIAL_HIGHLIGHTS, SOCIAL_PROFILES } from "@/lib/social-highlights";

describe("social highlights", () => {
  it("uses the official SafrBwai profiles", () => {
    expect(SOCIAL_PROFILES).toEqual({
      tiktok: "https://www.tiktok.com/@safrbwai",
      x: "https://x.com/SafrBwai",
    });
  });

  it("keeps three bilingual highlights in each strip", () => {
    for (const [platform, highlights] of Object.entries(SOCIAL_HIGHLIGHTS)) {
      expect(highlights).toHaveLength(3);
      expect(highlights.every((highlight) => highlight.platform === platform)).toBe(true);
      expect(highlights.every((highlight) => highlight.title.ar && highlight.title.en)).toBe(true);
      expect(highlights.every((highlight) => highlight.description.ar && highlight.description.en)).toBe(true);
      expect(highlights.every((highlight) => highlight.action.ar && highlight.action.en)).toBe(true);
    }
  });

  it("links every X highlight to a post from the official account", () => {
    expect(
      SOCIAL_HIGHLIGHTS.x.every((highlight) =>
        /^https:\/\/x\.com\/SafrBwai\/status\/\d+$/.test(highlight.href),
      ),
    ).toBe(true);
  });

  it("uses the verified TikTok profile until individual video links are available", () => {
    expect(SOCIAL_HIGHLIGHTS.tiktok.every((highlight) => highlight.href === SOCIAL_PROFILES.tiktok)).toBe(true);
  });
});

