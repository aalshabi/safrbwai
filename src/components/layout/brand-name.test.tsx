import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { SAFRBWAI_URL } from "@/lib/result-actions/format-questions";
import { Navbar } from "./navbar";
import { Footer } from "./footer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/analyze-offer",
}));

const ARABIC_BRAND_NAME = "سافر بوعي";
const ENGLISH_BRAND_NAME = "SafrBwai";
const UNAPPROVED_ENGLISH_NAME = ["Safer", "Bewae"].join(" ");
const RETIRED_NAMES = /Travel Lab|مختبر عبدالله/;

const HEADER_LINKS = [
  "/",
  "/analyze-offer",
  "/guides",
  "/analyze-hotel",
  "/insights",
];

const FOOTER_LINKS = [
  "/",
  "https://x.com/SafrBwai",
  "https://www.tiktok.com/@safrbwai",
  "/analyze-offer",
  "/guides",
  "/analyze-hotel",
  "/#about",
  "/insights",
  "/privacy",
  "/terms",
];

function renderLayout() {
  return render(
    <LanguageProvider>
      <Navbar />
      <Footer />
    </LanguageProvider>
  );
}

function hrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a")).map((link) => link.getAttribute("href") ?? "");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("visible brand name", () => {
  it("uses the approved Arabic brand name in the header and footer", () => {
    const { container } = renderLayout();
    const header = container.querySelector("header");
    const footer = container.querySelector("footer");

    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(within(header!).getByRole("link", { name: ARABIC_BRAND_NAME })).toBeTruthy();
    expect(within(footer!).getByRole("link", { name: ARABIC_BRAND_NAME })).toBeTruthy();
    expect(within(footer!).getAllByText(new RegExp(ARABIC_BRAND_NAME))).toHaveLength(2);
  });

  it("uses SafrBwai in the English header and footer", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    const { container } = renderLayout();
    const header = container.querySelector("header");
    const footer = container.querySelector("footer");

    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(await within(header!).findByRole("link", { name: ENGLISH_BRAND_NAME })).toBeTruthy();
    expect(within(footer!).getByRole("link", { name: ENGLISH_BRAND_NAME })).toBeTruthy();
    expect(within(footer!).getAllByText(new RegExp(ENGLISH_BRAND_NAME))).toHaveLength(2);
    expect(header!.textContent).not.toContain(UNAPPROVED_ENGLISH_NAME);
    expect(footer!.textContent).not.toContain(UNAPPROVED_ENGLISH_NAME);
  });

  it("derives navigation from visible capabilities and removes disabled entry points", () => {
    const { container } = renderLayout();
    const header = container.querySelector("header");
    const footer = container.querySelector("footer");
    const headerHrefs = hrefs(header!);

    expect(Array.from(new Set(headerHrefs))).toEqual(HEADER_LINKS);
    expect(headerHrefs).not.toContain("/auth");
    expect(headerHrefs).not.toContain("/auth?mode=signup");
    expect(headerHrefs).not.toContain("/dashboard");
    expect(headerHrefs).not.toContain("/admin");
    expect(hrefs(footer!)).toEqual(FOOTER_LINKS);
  });

  it("opens the footer's social accounts in a new tab without handing over the opener", () => {
    const { container } = renderLayout();
    const footer = container.querySelector("footer")!;

    for (const href of ["https://x.com/SafrBwai", "https://www.tiktok.com/@safrbwai"]) {
      const link = footer.querySelector(`a[href="${href}"]`);
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("never shows the retired «Abdullah Travel Lab» name", async () => {
    for (const locale of ["ar", "en"]) {
      window.localStorage.setItem("safer-bewae-locale", locale);
      const { container, unmount } = renderLayout();
      if (locale === "en") await within(container).findAllByRole("link", { name: ENGLISH_BRAND_NAME });
      expect(container.textContent).not.toMatch(RETIRED_NAMES);
      unmount();
    }
    // The root layout loads Google fonts at import, so its metadata is checked as source.
    const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).not.toMatch(RETIRED_NAMES);
    expect(JSON.stringify(dictionaries)).not.toMatch(RETIRED_NAMES);
  });

  it("keeps the canonical SafrBwai website URL unchanged", () => {
    expect(SAFRBWAI_URL).toBe("https://www.safrbwai.com");
  });
});
