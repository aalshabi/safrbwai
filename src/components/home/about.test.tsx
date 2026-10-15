import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { About } from "./about";

vi.mock("@/components/shared/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => children,
}));

function renderAbout() {
  return render(
    <LanguageProvider>
      <About />
    </LanguageProvider>
  );
}

function expectExternal(link: HTMLElement, href: string) {
  expect(link.getAttribute("href")).toBe(href);
  expect(link.getAttribute("target")).toBe("_blank");
  expect(link.getAttribute("rel")).toBe("noopener noreferrer");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ownership disclosure", () => {
  it("names the owner and his travel agency in Arabic, under the footer's #about anchor", () => {
    const { container } = renderAbout();

    expect(container.querySelector("section#about")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "من يقف وراء سافر بوعي" })).toBeTruthy();
    expect(screen.getByText(/عبدالله الشعبي، مالك وكالة سكاي العالمية للسفر/)).toBeTruthy();
    expect(screen.getByText(/لا ترشّح أي وكالة أو بائع، بما في ذلك سكاي العالمية/)).toBeTruthy();
    expectExternal(
      screen.getByRole("link", { name: "سافر بوعي على X (يفتح في نافذة جديدة)" }),
      "https://x.com/SafrBwai"
    );
    expectExternal(
      screen.getByRole("link", { name: "سافر بوعي على تيك توك (يفتح في نافذة جديدة)" }),
      "https://www.tiktok.com/@safrbwai"
    );
  });

  it("names the owner and his travel agency in English", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    renderAbout();

    expect(await screen.findByRole("heading", { name: "Who is behind SafrBwai" })).toBeTruthy();
    expect(screen.getByText(/owner of the travel agency Sky Global Holidays/)).toBeTruthy();
    expect(screen.getByText(/Sky Global Holidays included/)).toBeTruthy();
    expectExternal(
      screen.getByRole("link", { name: "SafrBwai on TikTok (opens in a new tab)" }),
      "https://www.tiktok.com/@safrbwai"
    );
  });

  it("no longer calls the site independent of the agency its owner runs", () => {
    for (const locale of ["ar", "en"] as const) {
      const copy = JSON.stringify(dictionaries[locale]);
      expect(copy).not.toMatch(/منتج مستقل|independent travel-offer review product/i);
    }
  });
});
