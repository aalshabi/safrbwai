import { describe, expect, it } from "vitest";
import { isWebAnalyticsEnabled, sanitizeAnalyticsUrl } from "./web-analytics";

describe("sanitizeAnalyticsUrl", () => {
  it.each([
    ["https://www.safrbwai.com/analyze-offer", "https://www.safrbwai.com/analyze-offer"],
    ["https://www.safrbwai.com/analyze-hotel?q=Hilton%20Riyadh&city=x#top", "https://www.safrbwai.com/analyze-hotel"],
    [
      "https://www.safrbwai.com/?utm_source=youtube&utm_medium=video&ref=abc&fbclid=123",
      "https://www.safrbwai.com/?utm_source=youtube&utm_medium=video",
    ],
    ["not a url", ""],
  ])("%s → %s", (raw, expected) => {
    expect(sanitizeAnalyticsUrl(raw)).toBe(expected);
  });

  it("caps a campaign value's length", () => {
    expect(sanitizeAnalyticsUrl(`https://x.com/?utm_campaign=${"a".repeat(300)}`)).toBe(`https://x.com/?utm_campaign=${"a".repeat(100)}`);
  });
});

describe("isWebAnalyticsEnabled", () => {
  it.each([
    ["production", true],
    ["preview", true],
    ["development", false],
    [undefined, false],
  ] as const)("%s → %s", (env, enabled) => {
    expect(isWebAnalyticsEnabled(env)).toBe(enabled);
  });
});
