import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { Features } from "./features";

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

describe("first-release feature cards", () => {
  it("shows only working capabilities", () => {
    const { container } = render(
      <LanguageProvider>
        <Features />
      </LanguageProvider>
    );

    const links = Array.from(container.querySelectorAll("a")).map(
      (link) => link.getAttribute("href") ?? ""
    );
    expect(links).toEqual(["/analyze-offer", "/guides"]);
    expect(links).not.toContain("/dashboard");
    expect(links).not.toContain("/auth");
    expect(screen.getAllByText("متاح")).toHaveLength(2);
    expect(screen.queryByText("معاينة")).toBeNull();
  });

  it("uses the capability registry's English titles and reasons", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    render(
      <LanguageProvider>
        <Features />
      </LanguageProvider>
    );

    expect(await screen.findByText("Travel offer analysis")).toBeTruthy();
    expect(screen.getByText("Offer review guides")).toBeTruthy();
    expect(screen.getByText("Deterministic text analysis is available now.")).toBeTruthy();
  });
});
