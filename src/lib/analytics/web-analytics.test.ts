import { describe, expect, it } from "vitest";
import { isWebAnalyticsEnabled, resolveWebAnalyticsScript, sanitizeAnalyticsUrl } from "./web-analytics";

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

describe("resolveWebAnalyticsScript", () => {
  it("uses the default path when Vercel sets no variables", () => {
    expect(resolveWebAnalyticsScript("", "")).toEqual({ src: "/_vercel/insights/script.js", dataset: {} });
  });

  it("uses the project path Vercel provides", () => {
    expect(resolveWebAnalyticsScript("/x7k2", "")).toEqual({
      src: "/x7k2/insights/script.js",
      dataset: { endpoint: "/x7k2/insights" },
    });
  });

  it("prefers the client config's script and endpoints", () => {
    const config = JSON.stringify({
      analytics: { scriptSrc: "a/script.js", viewEndpoint: "a/view", dsn: "d1", endpoint: "https://e.example/insights" },
    });
    expect(resolveWebAnalyticsScript("/x7k2", config)).toEqual({
      src: "/a/script.js",
      dataset: { viewEndpoint: "/a/view", dsn: "d1", endpoint: "https://e.example/insights" },
    });
  });

  it("ignores a malformed client config", () => {
    expect(resolveWebAnalyticsScript("/x7k2", "{not json").src).toBe("/x7k2/insights/script.js");
  });
});
