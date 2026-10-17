import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { TravelOfferInputSelector } from "./travel-offer-input-selector";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TravelOfferInputSelector sources", () => {
  it("enables text, PDF, image and link in Production", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const onSelect = vi.fn();
    render(
      <LanguageProvider>
        <TravelOfferInputSelector method="text" onSelect={onSelect} />
      </LanguageProvider>
    );

    for (const [name, method] of [[/ملف PDF/, "pdf"], [/صورة/, "image"], [/رابط/, "url"]] as const) {
      const tab = screen.getByRole("tab", { name });
      expect(tab.hasAttribute("disabled")).toBe(false);
      fireEvent.click(tab);
      expect(onSelect).toHaveBeenLastCalledWith(method);
    }
    expect(screen.getByRole("tab", { name: "نص" }).hasAttribute("disabled")).toBe(false);
    expect(screen.queryByText("قريبًا")).toBeNull();
  });
});
