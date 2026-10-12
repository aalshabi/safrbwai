import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n/provider";
import { ProductStageNotice } from "./product-stage-notice";

function renderNotice() {
  return render(
    <LanguageProvider>
      <ProductStageNotice />
    </LanguageProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ProductStageNotice", () => {
  it("shows the Arabic public-release label, text-only scope, safety warning, and policy links", () => {
    renderNotice();

    expect(screen.getByRole("heading", { name: "الإصدار الأول" })).toBeTruthy();
    expect(screen.getByText("إصدار عام")).toBeTruthy();
    expect(screen.queryByText(/ما قبل الإطلاق/)).toBeNull();
    expect(
      screen.getByText("تحليل النص متاح حاليًا. ملفات PDF والصور والروابط غير مدعومة بعد.")
    ).toBeTruthy();
    expect(
      screen.getByText(
        "سافر بوعي يساعدك على مراجعة المعلومات المذكورة في العرض، لكنه لا يتحقق من هوية البائع ولا يضمن صحة العرض. لا تُدخل بيانات شخصية أو معلومات دفع."
      )
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "سياسة الخصوصية" }).getAttribute("href")).toBe(
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "الشروط والأحكام" }).getAttribute("href")).toBe(
      "/terms"
    );
  });

  it("shows the English public-release label and safety warning", async () => {
    window.localStorage.setItem("safer-bewae-locale", "en");
    renderNotice();

    expect(await screen.findByRole("heading", { name: "First release" })).toBeTruthy();
    expect(screen.getByText("Public release")).toBeTruthy();
    expect(screen.queryByText(/Pre-launch/)).toBeNull();
    expect(
      screen.getByText(
        "Text analysis is currently available. PDF files, images, and links are not supported yet."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "SafrBwai helps you review the information stated in an offer. It does not verify the seller or guarantee the offer’s accuracy. Do not enter personal or payment information."
      )
    ).toBeTruthy();
  });
});
