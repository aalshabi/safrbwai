import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

describe("SocialHighlights embeds", () => {
  it("loads nothing from X or TikTok until the visitor asks", () => {
    const { container } = renderHighlights();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getAllByRole("button", { name: "اعرض المنشور هنا" })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "اعرض الفيديوهات هنا" })).toBeTruthy();
  });

  it("mounts the official post embed in place after a click", () => {
    const { container } = renderHighlights();
    fireEvent.click(screen.getAllByRole("button", { name: "اعرض المنشور هنا" })[0]);
    const frames = container.querySelectorAll("iframe");
    expect(frames).toHaveLength(1);
    const src = new URL(frames[0].getAttribute("src")!);
    expect(src.origin).toBe("https://platform.twitter.com");
    expect(src.searchParams.get("id")).toBe("2050941925461529038");
    expect(frames[0].getAttribute("title")).toBe("دليل تايلاند 2026");
  });

  it("mounts the TikTok profile embed, page-wide, after a click", () => {
    const { container } = renderHighlights();
    fireEvent.click(screen.getByRole("button", { name: "اعرض الفيديوهات هنا" }));
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("src")).toBe("https://www.tiktok.com/embed/@safrbwai");
    // Full page width under the strip heading, not squeezed into a carousel card.
    expect(frame?.closest("article")).toBeNull();
    expect(frame?.className).toContain("w-full");
  });
});
