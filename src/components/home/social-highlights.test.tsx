import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { SocialHighlights } from "./social-highlights";

vi.mock("@/components/shared/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function renderHighlights() {
  return render(
    <LanguageProvider>
      <SocialHighlights />
    </LanguageProvider>
  );
}

let observed: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];

function installObserver() {
  observed = [];
  class FakeObserver {
    constructor(private callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observed.push(callback);
    }
    observe() {}
    disconnect() {}
  }
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: FakeObserver });
}

function scrollIntoSection() {
  act(() => observed.forEach((callback) => callback([{ isIntersecting: true }])));
}

describe("SocialHighlights embeds", () => {
  beforeEach(installObserver);

  it("loads nothing from X or TikTok until the section is near the screen", () => {
    const { container } = renderHighlights();
    expect(container.querySelector("iframe")).toBeNull();
    // Our own cards stand in, each with a link to the original.
    expect(screen.getByText("دليل تايلاند 2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: /فتح الحساب على تيك توك/ })).toBeTruthy();
  });

  it("shows the official X posts and TikTok account once the section is reached", () => {
    const { container } = renderHighlights();
    scrollIntoSection();
    const sources = [...container.querySelectorAll("iframe")].map((frame) => new URL(frame.getAttribute("src")!));
    expect(sources.filter((src) => src.origin === "https://platform.twitter.com").map((src) => src.searchParams.get("id"))).toEqual([
      "2050941925461529038",
      "2106058301876097401",
      "2085437614832939399",
    ]);
    expect(sources.filter((src) => src.origin === "https://www.tiktok.com").map(String)).toEqual([
      "https://www.tiktok.com/embed/@safrbwai",
    ]);
    // No click needed, and no "show here" buttons left.
    expect(screen.queryByRole("button", { name: /اعرض/ })).toBeNull();
  });
});
