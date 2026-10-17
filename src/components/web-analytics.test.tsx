import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { WebAnalytics } from "./web-analytics";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  document.head.querySelectorAll('script[src="/_vercel/insights/script.js"]').forEach((s) => s.remove());
  delete window.va;
  delete window.vaq;
});

describe("WebAnalytics", () => {
  it("loads nothing outside Vercel", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    render(<WebAnalytics />);
    expect(document.head.querySelector('script[src="/_vercel/insights/script.js"]')).toBeNull();
    expect(window.va).toBeUndefined();
  });

  it("registers a URL-cleaning beforeSend before loading the script once", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    render(<WebAnalytics />);
    render(<WebAnalytics />);
    expect(document.head.querySelectorAll('script[src="/_vercel/insights/script.js"]')).toHaveLength(1);
    const [name, beforeSend] = window.vaq![0] as [string, (e: { type: string; url: string }) => unknown];
    expect(name).toBe("beforeSend");
    expect(beforeSend({ type: "pageview", url: "https://www.safrbwai.com/analyze-hotel?q=secret&utm_source=x" })).toEqual({
      type: "pageview",
      url: "https://www.safrbwai.com/analyze-hotel?utm_source=x",
    });
    expect(beforeSend({ type: "pageview", url: "::" })).toBeNull();
  });
});
