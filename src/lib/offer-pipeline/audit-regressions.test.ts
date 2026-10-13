/**
 * Regressions from the external audit of the public analyzer: each input is the
 * one the audit ran, and each assertion pins either a defect it found or a
 * behaviour it confirmed as correct, so a fix to one cannot silently undo the
 * other.
 */

import { describe, expect, it } from "vitest";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { runOfferPipeline } from "./pipeline";

async function facts(text: string) {
  const result = await runOfferPipeline({ type: "text", text });
  if (result.status !== "ok") throw new Error(`pipeline ${result.status}`);
  return result.extraction.facts;
}

const DUBAI =
  "عرض دبي 5 ليالٍ لشخصين في فندق 5 نجوم شامل الإفطار وتذاكر الطيران. السعر الإجمالي 8,500 ريال. الإلغاء مجاني.";
const ISTANBUL =
  "باقة إسطنبول 7 ليالٍ بسعر 6,200 ريال للشخصين. البرنامج 6 ليالٍ في فندق تقسيم. السعر 5,900 ريال شامل الضريبة.";
const MALDIVES =
  "Maldives package, 4 nights water villa, half board, total USD 3,400 for two, seaplane transfer not included.";

describe("Dubai offer", () => {
  it("reads «شامل الإفطار وتذاكر الطيران» as flight included", async () => {
    const f = await facts(DUBAI);
    expect(f.flight?.value).toEqual({ included: true });
    expect(f.flight?.evidence).toContain("تذاكر الطيران");
  });

  it("keeps the facts the audit found correct", async () => {
    const f = await facts(DUBAI);
    expect(f.totalPrice?.value).toMatchObject({ amount: 8500 });
    expect(f.nights?.value).toBe(5);
    expect(f.travelers?.value).toEqual({ adults: 2 });
    expect(f.board?.value).toBe("BB");
    expect(f.accommodation?.value).toBe("فندق 5 نجوم");
    expect(f.cancellationPolicy?.value).toBe("الإلغاء مجاني");
  });
});

describe("Istanbul offer", () => {
  it("never turns a hotel name or district into an accommodation category", async () => {
    // «فندق تقسيم» names a place, not a category: the rule warns instead.
    const f = await facts(ISTANBUL);
    expect(f.accommodation).toBeUndefined();
  });

  it("keeps the two conflicting prices and nights for the contradiction check", async () => {
    const f = await facts(ISTANBUL);
    expect(f.totalPrice?.value).toMatchObject({ amount: 6200 });
    expect(f.statedPrice?.value).toMatchObject({ amount: 5900 });
  });
});

describe("Maldives offer", () => {
  it("does not turn the price's «for two» into a travellers fact", async () => {
    // «for two» qualifies the total (see party-total.test.ts): the audit read
    // it as a missed head count, but inferring travellers from a price phrase
    // is a deliberate exclusion, so the field stays missing and is asked.
    const f = await facts(MALDIVES);
    expect(f.travelers).toBeUndefined();
  });

  it("reads «water villa» as the accommodation", async () => {
    const f = await facts(MALDIVES);
    expect(f.accommodation?.value).toBe("water villa");
  });

  it("states the country it was given, not the capital Malé", async () => {
    const f = await facts(MALDIVES);
    expect(f.destination?.value).toMatchObject({ value: "Maldives", canonicalValue: "Maldives", countryCode: "MV" });
  });

  it("keeps the excluded seaplane transfer", async () => {
    const f = await facts(MALDIVES);
    expect(f.transfer?.value).toMatchObject({ included: false });
  });
});

describe("built-in sample text", () => {
  it.each([
    ["ar", "سياسة الإلغاء: غير قابل للاسترداد قبل 14 يومًا من السفر"],
    ["en", "Cancellation policy: non-refundable within 14 days of travel"],
  ] as const)("%s: the cancellation policy is read to the end of its sentence", async (locale, expected) => {
    const f = await facts(dictionaries[locale].analyzeOffer.v1.text.sample);
    expect(f.cancellationPolicy?.value).toBe(expected);
  });

  it("a policy longer than the cap is cut at a word, never inside one", async () => {
    const long = `سياسة الإلغاء: ${"يسترد المبلغ كاملا ".repeat(10)}بعد الخصم.`;
    const value = (await facts(long)).cancellationPolicy?.value as string;
    expect(long.slice(0, -1).startsWith(value)).toBe(true);
    expect(long.charAt(value.length)).toBe(" ");
  });
});
