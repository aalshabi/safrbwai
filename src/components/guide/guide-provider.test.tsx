import * as React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { GUIDE_STORAGE_KEY } from "@/lib/guide/storage";
import { GuideProvider } from "./guide-provider";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

function renderGuide(child: React.ReactNode = <main>Page</main>) {
  return render(
    <LanguageProvider>
      <GuideProvider>{child}</GuideProvider>
    </LanguageProvider>
  );
}

beforeAll(() => {
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  }) as typeof requestAnimationFrame;
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollBy = vi.fn();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: false })),
  });
});

beforeEach(() => {
  pathname = "/";
  window.localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

describe("SafrBwai Guide", () => {
  it("shows an accessible Arabic launcher on supported routes", async () => {
    renderGuide();
    expect(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" })).toBeTruthy();
  });

  it("uses the English name and LTR dialog when English is selected", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    renderGuide();
    fireEvent.click(await screen.findByRole("button", { name: "Open SafrBwai Guide" }));
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByText("SafrBwai Guide")).toBeTruthy();
    expect(dialog.getAttribute("dir")).toBe("ltr");
  });

  it("does not render on privacy, terms, or auth routes", async () => {
    for (const route of ["/privacy", "/terms", "/auth"]) {
      pathname = route;
      const view = renderGuide();
      await waitFor(() => expect(screen.queryByRole("button", { name: "افتح مساعد سافر بوعي" })).toBeNull());
      view.unmount();
    }
  });

  it("opens, advances, moves back, and restarts from the first step", async () => {
    renderGuide();
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    expect(screen.getByRole("heading", { name: "إصدار ما قبل الإطلاق" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    expect(screen.getByRole("heading", { name: "الأداة المتاحة الآن" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "السابق" }));
    expect(screen.getByRole("heading", { name: "إصدار ما قبل الإطلاق" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إعادة الجولة" }));
    expect(screen.getByText("الخطوة ١ من ٥")).toBeTruthy();
  });

  it("records a skip without reading page text", async () => {
    renderGuide(<textarea defaultValue="private offer text" />);
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    fireEvent.click(screen.getByRole("button", { name: "تخطي الجولة" }));
    const saved = window.localStorage.getItem(GUIDE_STORAGE_KEY)!;
    expect(JSON.parse(saved)).toEqual({ completed: false, skipped: true, lastRoute: "/", version: 1 });
    expect(saved).not.toContain("private offer text");
  });

  it("records completion only after the last step", async () => {
    renderGuide();
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    }
    expect(screen.getByRole("link", { name: "افتح تحليل عرض السفر" }).getAttribute("href")).toBe("/analyze-offer");
    fireEvent.click(screen.getByRole("button", { name: "إنهاء الجولة" }));
    expect(JSON.parse(window.localStorage.getItem(GUIDE_STORAGE_KEY)!)).toEqual({
      completed: true,
      skipped: false,
      lastRoute: "/",
      version: 1,
    });
  });

  it("closes with Escape and restores focus to the launcher", async () => {
    renderGuide();
    const launcher = await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" });
    fireEvent.click(launcher);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(launcher);
  });

  it("keeps keyboard focus cycling inside the panel", async () => {
    renderGuide();
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "إغلاق المساعد" });
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("does not make network calls while the guide is used", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderGuide();
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    fireEvent.click(screen.getByRole("button", { name: "إغلاق المساعد" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not auto-start and remains available on request", async () => {
    vi.useFakeTimers();
    pathname = "/analyze-offer";
    renderGuide(<div data-guide-id="offer-source-text">Text source</div>);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "افتح مساعد سافر بوعي" })).toBeTruthy();
    expect(window.localStorage.getItem(GUIDE_STORAGE_KEY)).toBeNull();
  });

  it("does not auto-start after completion or skip", async () => {
    vi.useFakeTimers();
    pathname = "/analyze-offer";
    for (const state of [
      { completed: true, skipped: false, version: 1 },
      { completed: false, skipped: true, version: 1 },
    ]) {
      window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state));
      const view = renderGuide(<div data-guide-id="offer-source-text" />);
      await vi.advanceTimersByTimeAsync(300);
      expect(screen.queryByRole("dialog")).toBeNull();
      view.unmount();
    }
  });

  it("uses a safe fallback message when a later target is not visible", async () => {
    pathname = "/analyze-offer";
    window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify({ completed: false, skipped: false, lastRoute: "/analyze-offer", version: 1 }));
    renderGuide(<div data-guide-id="offer-source-text" />);
    fireEvent.click(await screen.findByRole("button", { name: "افتح مساعد سافر بوعي" }));
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));
    expect(screen.getByRole("status").textContent).toContain("غير ظاهر");
  });
});
