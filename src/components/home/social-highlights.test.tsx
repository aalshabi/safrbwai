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

  it("loads nothing from X until the section is near the screen", () => {
    const { container } = renderHighlights();
    expect(container.querySelector("iframe")).toBeNull();
    // Our own cards stand in, each with a link to the original.
    expect(screen.getByText("دليل تايلاند 2026")).toBeTruthy();
  });

  it("shows the official X posts once the section is reached, and no TikTok account page", () => {
    const { container } = renderHighlights();
    scrollIntoSection();
    const sources = [...container.querySelectorAll("iframe")].map((frame) => new URL(frame.getAttribute("src")!));
    expect(sources.filter((src) => src.origin === "https://platform.twitter.com").map((src) => src.searchParams.get("id"))).toEqual([
      "2050941925461529038",
      "2106058301876097401",
      "2085437614832939399",
    ]);
    // No account-page embed; with no TikTok videos listed, the TikTok strip is not shown at all.
    expect(sources.some((src) => src.pathname.startsWith("/embed/@"))).toBe(false);
    expect(screen.queryByText("فيديوهات مختارة على تيك توك")).toBeNull();
    expect(screen.queryByRole("button", { name: /اعرض/ })).toBeNull();
  });

  it("keeps our card until the X embed reports it rendered, and caps tall posts", () => {
    const { container } = renderHighlights();
    scrollIntoSection();
    const frames = [...container.querySelectorAll("iframe")];
    const [thailand, karakoy] = ["2050941925461529038", "2106058301876097401"].map(
      (id) => frames.find((frame) => frame.src.includes(id))!
    );
    const resize = (frame: HTMLIFrameElement, height: number, origin = "https://platform.twitter.com") =>
      act(() => {
        window.dispatchEvent(new MessageEvent("message", {
          origin,
          source: frame.contentWindow,
          data: JSON.stringify({ "twttr.embed": { method: "twttr.private.resize", params: [{ height }] } }),
        }));
      });

    // Loading (or blocked): the fallback stays and the frame is hidden from everyone.
    expect(screen.getByText("دليل تايلاند 2026")).toBeTruthy();
    expect(thailand.getAttribute("aria-hidden")).toBe("true");

    // A message from elsewhere does not count.
    resize(thailand, 300, "https://evil.example");
    expect(screen.getByText("دليل تايلاند 2026")).toBeTruthy();

    // A short post shows at its own height, without the "read more" fade.
    resize(thailand, 300);
    expect(screen.queryByText("دليل تايلاند 2026")).toBeNull();
    expect(thailand.getAttribute("aria-hidden")).toBeNull();
    expect(thailand.style.height).toBe("300px");
    expect(screen.queryAllByRole("link", { name: /اقرأ المنشور كاملًا على X/ })).toHaveLength(0);

    // A tall post (photo or video) is cut to a sensible height, with a link to the full post.
    resize(karakoy, 900);
    expect(karakoy.style.height).toBe("460px");
    const more = screen.getByRole("link", { name: /اقرأ المنشور كاملًا على X/ });
    expect(more.getAttribute("href")).toBe("https://x.com/SafrBwai/status/2106058301876097401");
  });

});
