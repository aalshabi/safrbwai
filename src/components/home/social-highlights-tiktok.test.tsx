import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { SocialHighlights } from "./social-highlights";

// Five sample videos, as the server passes the account's newest: only four may show.
const video = (n: number) => ({
  id: `video-${n}`,
  platform: "tiktok" as const,
  title: { ar: `فيديو ${n}`, en: `Video ${n}` },
  description: { ar: "", en: "" },
  action: { ar: "شاهد على تيك توك", en: "Watch on TikTok" },
  href: `https://www.tiktok.com/@safrbwai/video/741234567890123456${n}`,
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
  it("names the ranking, its range and its date when the strip is ranked", () => {
    render(
      <LanguageProvider>
        <SocialHighlights
          tiktok={{ items: [1, 2].map(video), source: "ranked", poolSize: 60, refreshedAt: "2026-10-20T00:00:00.000Z" }}
        />
      </LanguageProvider>
    );
    expect(screen.getByText(/الأكثر مشاهدة بين آخر 60 فيديو في الحساب/)).toBeTruthy();
    expect(screen.getByText(/آخر تحديث 20 أكتوبر 2026/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "الفيديو التالي" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "سافر بوعي على تيك توك" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("link", { name: /فتح الحساب على تيك توك/ }).getAttribute("href")).toBe("https://www.tiktok.com/@safrbwai");
  });

  it("labels a hand-picked strip as picks from the account", () => {
    render(
      <LanguageProvider>
        <SocialHighlights tiktok={{ items: [video(1)], source: "manual" }} />
      </LanguageProvider>
    );
    expect(screen.getAllByText("مختارات من الحساب").length).toBeGreaterThan(0);
  });

  it("shows each video in TikTok's own player, four at most, like the X posts", () => {
    const { container } = render(
      <LanguageProvider>
        <SocialHighlights tiktok={{ items: [1, 2, 3, 4, 5].map(video), source: "manual" }} />
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
