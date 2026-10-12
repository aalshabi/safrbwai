import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { AuthUnavailable } from "./auth-unavailable";

function renderUnavailable() {
  return render(
    <LanguageProvider>
      <AuthUnavailable />
    </LanguageProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("disabled account page", () => {
  it("shows the Arabic disabled state without a form or network request", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { container } = renderUnavailable();

    expect(
      screen.getByRole("heading", {
        name: "الحسابات غير متاحة في الإصدار الحالي.",
      })
    ).toBeTruthy();
    expect(screen.getByText(/تسجيل الدخول وإنشاء الحسابات غير مفعّلين/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "حلّل عرض سفر" }).getAttribute("href")).toBe(
      "/analyze-offer"
    );
    expect(screen.queryByText("الحسابات غير متاحة في الـBeta الحالية")).toBeNull();
    expect(screen.queryByText("حلّل عرضًا نصيًا")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the English disabled state without sign-in controls", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    const { container } = renderUnavailable();

    expect(
      await screen.findByRole("heading", {
        name: "Accounts are not available in the current release.",
      })
    ).toBeTruthy();
    expect(screen.getByText(/Sign-in and account creation are not currently enabled/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Analyze a travel offer" }).getAttribute("href")
    ).toBe("/analyze-offer");
    expect(
      screen.queryByText("Accounts are unavailable in the current pre-launch release")
    ).toBeNull();
    expect(screen.queryByText("Analyze a text offer")).toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByLabelText(/email|password/i)).toBeNull();
  });
});
