import { describe, it, expect } from "vitest";
import { destinationRule } from "./destination-rule";
import { DESTINATIONS } from "@/lib/offer-pipeline/data/destinations";

describe("destinationRule — tier 1: curated dictionary", () => {
  // (1)
  it("matches a known Arabic destination as canonical_alias", () => {
    const d = destinationRule.apply("عرض إلى دبي").facts.destination;
    expect(d?.value).toEqual({ value: "دبي", canonicalValue: "Dubai", countryCode: "AE", matchType: "canonical_alias" });
    expect(d?.confidenceType).toBe("exact");
    expect(d?.evidence).toBe("دبي");
  });

  // (2)
  it("matches Sarajevo from the dictionary", () => {
    const d = destinationRule.apply("رحلة إلى سراييفو لمدة 4 ليالٍ").facts.destination;
    expect(d?.value.canonicalValue).toBe("Sarajevo");
    expect(d?.value.countryCode).toBe("BA");
    expect(d?.value.matchType).toBe("canonical_alias");
  });

  // (3)
  it("captures only the destination from a full offer sentence", () => {
    const d = destinationRule.apply("عرض إلى كيوتو لمدة 5 ليالٍ لشخصين").facts.destination;
    expect(d?.value.value).toBe("كيوتو");
    expect(d?.value.canonicalValue).toBe("Kyoto");
  });

  // (4)
  it("captures only the destination after an explicit 'الوجهة:' label", () => {
    const d = destinationRule.apply("الوجهة: إنترلاكن، لشخصين").facts.destination;
    expect(d?.value.value).toBe("إنترلاكن");
    expect(d?.value.canonicalValue).toBe("Interlaken");
  });

  // (10)
  it("works in English and across alternate spellings", () => {
    expect(destinationRule.apply("5 nights in Istanbul").facts.destination?.value.canonicalValue).toBe("Istanbul");
    expect(destinationRule.apply("رحلة إلى اسطنبول").facts.destination?.value.canonicalValue).toBe("Istanbul");
    expect(destinationRule.apply("trip to Bali for 2").facts.destination?.value.canonicalValue).toBe("Bali");
  });

  it("prefers the longest alias so multi-word names are not shadowed", () => {
    const d = destinationRule.apply("عرض إلى أبو ظبي").facts.destination;
    expect(d?.value.canonicalValue).toBe("Abu Dhabi");
  });
});

describe("destinationRule — tier 2: explicit-mention fallback", () => {
  // (5)
  it("captures an unlisted destination stated after an explicit marker", () => {
    const r = destinationRule.apply("عرض إلى بحيرة غريبة لمدة 3 ليالٍ");
    expect(r.facts.destination?.value.matchType).toBe("explicit_mention");
    expect(r.facts.destination?.value.value).toBe("بحيرة غريبة");
  });

  // (6)
  it("never invents a canonical name or country for an unknown destination", () => {
    const d = destinationRule.apply("الوجهة: وادي المسك الأخضر").facts.destination;
    expect(d?.value.matchType).toBe("explicit_mention");
    expect(d?.value.canonicalValue).toBeUndefined();
    expect(d?.value.countryCode).toBeUndefined();
  });

  it("reports an internal warning for an unmatched explicit mention", () => {
    const r = destinationRule.apply("عرض إلى بحيرة غريبة");
    expect(r.warnings.length).toBe(1);
    expect(r.warnings[0].ar).toContain("بحيرة غريبة");
  });

  // (7)
  it("extracts NOTHING from a general description with no travel marker", () => {
    for (const text of [
      "مدينة ساحلية هادئة تشتهر بالمأكولات البحرية",
      "الفندق يقع في منطقة جبلية جميلة",
      "a quiet coastal town famous for seafood",
    ]) {
      expect(destinationRule.apply(text).facts.destination).toBeUndefined();
    }
  });

  it("does not treat 'بالإضافة إلى' as a destination marker", () => {
    expect(destinationRule.apply("بالإضافة إلى الخدمات الإضافية المتاحة").facts.destination).toBeUndefined();
  });

  it("stops the capture at stop-words, numbers and punctuation", () => {
    expect(destinationRule.apply("عرض إلى وادي النجوم لمدة 5 ليالٍ").facts.destination?.value.value).toBe("وادي النجوم");
    expect(destinationRule.apply("trip to Green Valley for 2 adults").facts.destination?.value.value).toBe("Green Valley");
    expect(destinationRule.apply("الوجهة: جزيرة الشمس، السعر 5000 ريال").facts.destination?.value.value).toBe("جزيرة الشمس");
  });

  // (9)
  it("keeps the original wording as evidence", () => {
    const r = destinationRule.apply("عرض إلى بحيرة غريبة لمدة 3 ليالٍ");
    expect(r.facts.destination?.evidence).toContain("بحيرة غريبة");
    expect("عرض إلى بحيرة غريبة لمدة 3 ليالٍ").toContain(r.facts.destination!.evidence);
  });
});

describe("destinations dictionary", () => {
  it("has no duplicate aliases across entries", () => {
    const seen = new Map<string, string>();
    for (const entry of DESTINATIONS) {
      for (const alias of entry.aliases) {
        const key = alias.toLowerCase();
        expect(seen.has(key), `duplicate alias "${alias}" (${seen.get(key)} vs ${entry.canonical})`).toBe(false);
        seen.set(key, entry.canonical);
      }
    }
  });

  it("is large enough to cover the MVP markets", () => {
    expect(DESTINATIONS.length).toBeGreaterThanOrEqual(150);
  });
});

/**
 * "من وإلى المطار" describes a transfer. The explicit-mention fallback used to
 * report the traveller's destination as «المطار».
 */
describe("destinationRule — a facility is never the destination", () => {
  const dest = (t: string) => destinationRule.apply(t).facts.destination?.value;

  it("rejects «المطار» after a travel marker", () => {
    expect(dest("شامل التنقلات من وإلى المطار. السعر الإجمالي 7,450 ريال.")).toBeUndefined();
    expect(dest("توصيل إلى الفندق")).toBeUndefined();
    expect(dest("transfer to the airport")).toBeUndefined();
  });

  it("but still takes a real unlisted destination from the same marker", () => {
    expect(dest("رحلة إلى وجهة غير مدرجة، شامل التنقلات من وإلى المطار")).toMatchObject({
      matchType: "explicit_mention",
    });
  });
});

describe("destinationRule — country names", () => {
  const dest = (t: string) => destinationRule.apply(t).facts.destination?.value;

  it("resolves a country an offer names on its own", () => {
    expect(dest("باكج ماليزيا 5 ليالٍ")).toMatchObject({ canonicalValue: "Malaysia", countryCode: "MY" });
    expect(dest("عرض تركيا ٧ ليالٍ")).toMatchObject({ canonicalValue: "Turkey", countryCode: "TR" });
    expect(dest("جورجيا ٦ ليالٍ لشخصين")).toMatchObject({ canonicalValue: "Georgia", countryCode: "GE" });
  });

  it("a city still wins over its country — the longest alias decides", () => {
    expect(dest("كوالالمبور 5 ليالٍ في ماليزيا")).toMatchObject({ canonicalValue: "Kuala Lumpur" });
    expect(dest("إسطنبول ٤ ليالٍ في تركيا")).toMatchObject({ canonicalValue: "Istanbul" });
  });

  // Short country names would otherwise match inside longer words.
  it("does not match an alias sitting inside another word", () => {
    expect(dest("رحلة الهندسة الجامعية ٣ ليالٍ")).toBeUndefined();
    expect(dest("٣ ليالٍ على الخطوط القطرية")).toBeUndefined();
    expect(dest("a Georgian restaurant")).toBeUndefined();
  });

  it("«عمان» stays Amman — Oman is listed only as «سلطنة عمان»", () => {
    expect(dest("عمان ٣ ليالٍ")).toMatchObject({ canonicalValue: "Amman", countryCode: "JO" });
    expect(dest("سلطنة عمان ٣ ليالٍ")).toMatchObject({ canonicalValue: "Oman", countryCode: "OM" });
  });
});

describe("destinationRule — which mention is the destination", () => {
  const dest = (t: string) => destinationRule.apply(t).facts.destination?.value;

  it("an airline's country adjective is not the destination", () => {
    expect(dest("عرض تركيا ٧ ليالٍ على الخطوط السعودية")).toMatchObject({ canonicalValue: "Turkey" });
    expect(dest("رحلة إلى تبليسي على طيران الإمارات")).toMatchObject({ canonicalValue: "Tbilisi" });
    expect(dest("7 nights in Turkey with Qatar Airways")).toMatchObject({ canonicalValue: "Turkey" });
  });

  it("the city after «إلى» wins over the one after «من»", () => {
    expect(dest("من الرياض إلى تبليسي ٦ ليالٍ")).toMatchObject({ canonicalValue: "Tbilisi" });
    expect(dest("from Jeddah to Istanbul, 5 nights")).toMatchObject({ canonicalValue: "Istanbul" });
  });

  // A country-level package departing from a Saudi city: the departure city is
  // more specific, but it is the origin, so it must not win.
  it("a destination COUNTRY beats an origin city", () => {
    expect(dest("من الرياض إلى ماليزيا 5 ليالٍ")).toMatchObject({ canonicalValue: "Malaysia" });
    expect(dest("من جدة إلى تركيا ٧ ليالٍ")).toMatchObject({ canonicalValue: "Turkey" });
  });

  it("a full offer resolves to the city stayed in, not a country named in passing", () => {
    expect(
      dest("عرض رحلة إلى جورجيا\n٦ ليالٍ\nفندق في تبليسي\nطيران على الخطوط السعودية")
    ).toMatchObject({ canonicalValue: "Tbilisi", countryCode: "GE" });
  });
});
