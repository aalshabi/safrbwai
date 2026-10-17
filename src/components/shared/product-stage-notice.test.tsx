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
  it("shows the Arabic public-release label, input scope, safety warning, and policy links", () => {
    renderNotice();

    expect(screen.getByRole("heading", { name: "الإصدار الأول" })).toBeTruthy();
    expect(screen.getByText("إصدار عام")).toBeTruthy();
    expect(screen.queryByText(/ما قبل الإطلاق/)).toBeNull();
    expect(
      screen.getByText("يمكنك لصق النص أو اختيار ملف PDF أو صورة أو إدخال رابط العرض. يُقرأ الملف والصورة على جهازك ولا يُرفعان، ويقرأ خادمنا الصفحة العامة للرابط دون حفظها.")
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
        "Paste text, choose a PDF or an image, or enter the offer link. Files and images are read on your device and not uploaded; our server reads a link's public page without storing it."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "SafrBwai helps you review the information stated in an offer. It does not verify the seller or guarantee the offer’s accuracy. Do not enter personal or payment information."
      )
    ).toBeTruthy();
  });
});
