import { describe, expect, it } from "vitest";
import {
  SOCIAL_HIGHLIGHTS,
  SOCIAL_PROFILES,
  MAX_HIGHLIGHTS,
  tiktokPlayerUrl,
  tiktokVideoId,
  xEmbedHeight,
  xEmbedUrl,
  xPostId,
} from "@/lib/social-highlights";

describe("social highlights", () => {
  it("uses the official SafrBwai profiles", () => {
    expect(SOCIAL_PROFILES).toEqual({
      tiktok: "https://www.tiktok.com/@safrbwai",
      x: "https://x.com/SafrBwai",
    });
  });

  it("keeps at most four bilingual highlights in each strip", () => {
    expect(MAX_HIGHLIGHTS).toBe(4);
    for (const [platform, highlights] of Object.entries(SOCIAL_HIGHLIGHTS)) {
      expect(highlights.length).toBeLessThanOrEqual(MAX_HIGHLIGHTS);
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

  it("links every TikTok highlight to one video of the official account, never the account page", () => {
    expect(SOCIAL_HIGHLIGHTS.tiktok.every((highlight) => tiktokVideoId(highlight.href) !== null)).toBe(true);
    expect(tiktokVideoId(SOCIAL_PROFILES.tiktok)).toBeNull();
    expect(tiktokVideoId("https://www.tiktok.com/@someone/video/123")).toBeNull();
    expect(tiktokVideoId("https://www.tiktok.com/@safrbwai/video/7412345678901234567")).toBe("7412345678901234567");
    expect(tiktokPlayerUrl("7412345678901234567")).toBe("https://www.tiktok.com/player/v1/7412345678901234567");
  });

  it("embeds each X highlight by its post id through the official embed host", () => {
    for (const highlight of SOCIAL_HIGHLIGHTS.x) {
      const id = xPostId(highlight.href);
      expect(id).toMatch(/^\d+$/);
      const url = new URL(xEmbedUrl(id!, "ar", "dark"));
      expect(url.origin).toBe("https://platform.twitter.com");
      expect(url.searchParams.get("id")).toBe(id);
      expect(url.searchParams.get("lang")).toBe("ar");
      expect(url.searchParams.get("dnt")).toBe("true");
    }
    expect(xPostId("https://x.com/someone-else/status/1")).toBeNull();
  });

  it("reads only X resize messages for the frame height", () => {
    const resize = { "twttr.embed": { method: "twttr.private.resize", params: [{ height: 612.4, width: 300 }] } };
    expect(xEmbedHeight(JSON.stringify(resize))).toBe(613);
    expect(xEmbedHeight(resize)).toBe(613);
    expect(xEmbedHeight("not json")).toBeNull();
    expect(xEmbedHeight({ "twttr.embed": { method: "twttr.private.trigger", params: [{ height: 5 }] } })).toBeNull();
    expect(xEmbedHeight({ "twttr.embed": { method: "twttr.private.resize", params: [{ height: -1 }] } })).toBeNull();
    expect(xEmbedHeight(null)).toBeNull();
  });
});
