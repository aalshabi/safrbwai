import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { getRelatedLinks } from "@/lib/related-content";
import { RelatedLinks } from "./related-links";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("RelatedLinks", () => {
  it("links each related page by its title", () => {
    const links = getRelatedLinks({ kind: "insight", slug: "ai-trip-planning-human-review" });
    render(
      <LanguageProvider>
        <RelatedLinks links={links} />
      </LanguageProvider>
    );
    expect(screen.getByRole("navigation", { name: "مواضيع ذات صلة" })).toBeTruthy();
    for (const link of links) {
      expect(screen.getByRole("link", { name: link.title.ar }).getAttribute("href")).toBe(link.href);
    }
  });

  it("renders nothing when there are no links", () => {
    const { container } = render(
      <LanguageProvider>
        <RelatedLinks links={[]} />
      </LanguageProvider>
    );
    expect(container.innerHTML).toBe("");
  });
});
