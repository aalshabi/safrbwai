import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { SocialHighlights } from "./social-highlights";

vi.mock("@/lib/social-highlights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social-highlights")>();
  // Five sample videos (no real ones are listed yet): only four may show.
  const video = (n: number) => ({
    id: `video-${n}`,
    platform: "tiktok" as const,
    title: { ar: `فيديو ${n}`, en: `Video ${n}` },
    description: { ar: "وصف", en: "Description" },
    action: { ar: "شاهد على تيك توك", en: "Watch on TikTok" },
    href: `https://www.tiktok.com/@safrbwai/video/741234567890123456${n}`,
  });
  return {
    ...actual,
    SOCIAL_HIGHLIGHTS: { ...actual.SOCIAL_HIGHLIGHTS, tiktok: [1, 2, 3, 4, 5].map(video) },
  };
});

vi.mock("@/components/shared/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

let observed: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = [];

beforeEach(() => {
  observed = [];
  class FakeObserver {
    constructor(private callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
      observed.push(callback);
    }
    observe() {}
    disconnect() {}
  }
  Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: FakeObserver });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TikTok videos", () => {
  it("shows each video in TikTok's own player, four at most, like the X posts", () => {
    const { container } = render(
      <LanguageProvider>
        <SocialHighlights />
      </LanguageProvider>
    );
    expect(container.querySelector('iframe[src^="https://www.tiktok.com"]')).toBeNull();
    act(() => observed.forEach((callback) => callback([{ isIntersecting: true }])));

    const players = [...container.querySelectorAll<HTMLIFrameElement>('iframe[src^="https://www.tiktok.com"]')];
    expect(players.map((frame) => frame.getAttribute("src"))).toEqual(
      [1, 2, 3, 4].map((n) => `https://www.tiktok.com/player/v1/741234567890123456${n}`)
    );
    expect(players.every((frame) => frame.style.height === "460px")).toBe(true);
    expect(screen.queryByText("فيديو 5")).toBeNull();
    // Each player keeps a link to its video on TikTok.
    expect(screen.getAllByRole("link", { name: /شاهد على تيك توك/ })).toHaveLength(4);
  });
});
