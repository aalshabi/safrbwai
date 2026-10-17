import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { TravelOfferInputSelector } from "./travel-offer-input-selector";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TravelOfferInputSelector sources", () => {
  it("enables text, PDF and image in Production and keeps the link disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const onSelect = vi.fn();
    render(
      <LanguageProvider>
        <TravelOfferInputSelector method="text" onSelect={onSelect} />
      </LanguageProvider>
    );

    for (const [name, method] of [[/ملف PDF/, "pdf"], [/صورة/, "image"]] as const) {
      const tab = screen.getByRole("tab", { name });
      expect(tab.hasAttribute("disabled")).toBe(false);
      fireEvent.click(tab);
      expect(onSelect).toHaveBeenLastCalledWith(method);
    }
    expect(screen.getByRole("tab", { name: "نص" }).hasAttribute("disabled")).toBe(false);

    const link = screen.getByRole("tab", { name: /رابط/ });
    expect(link.hasAttribute("disabled")).toBe(true);
    expect(link.getAttribute("aria-disabled")).toBe("true");
    onSelect.mockClear();
    fireEvent.click(link);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getAllByText("قريبًا")).toHaveLength(1);
  });
});
