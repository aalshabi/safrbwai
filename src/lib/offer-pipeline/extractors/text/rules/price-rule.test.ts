import { describe, it, expect } from "vitest";
import { priceRule, extractPriceObservations } from "./price-rule";

const amounts = (text: string) => extractPriceObservations(text).map((p) => p.amount);

describe("priceRule", () => {
  it("extracts amount + currency from Arabic (amount before currency)", () => {
    const r = priceRule.apply("السعر الإجمالي ٣٢٠٠ ر.س لكل شخص");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.confidenceType).toBe("exact");
    expect(r.facts.price?.evidence).toContain("٣٢٠٠");
    expect(r.facts.perPersonPrice?.value).toEqual({ amount: 3200, currency: "SAR" });
  });

  it("extracts amount + currency from English (currency before amount)", () => {
    const r = priceRule.apply("Total price SAR 3,200 per person");
    expect(r.facts.price?.value).toEqual({ amount: 3200, currency: "SAR" });
    expect(r.facts.price?.evidence).toContain("3,200");
    expect(r.facts.perPersonPrice?.value).toEqual({ amount: 3200, currency: "SAR" });
  });

  it("recognizes standalone English Total labels as the trip total", () => {
    for (const text of ["Total: SAR 2,000.", "Total SAR 2,000."]) {
      const r = priceRule.apply(text);
      expect(r.facts.totalPrice?.value).toEqual({ amount: 2000, currency: "SAR" });
      expect(r.observations?.prices).toEqual([
        expect.objectContaining({ amount: 2000, currency: "SAR", basis: "total" }),
      ]);
    }
  });

  it("handles the $ symbol", () => {
    const r = priceRule.apply("Package for $1200 only");
    expect(r.facts.price?.value).toEqual({ amount: 1200, currency: "USD" });
  });

  it("does NOT extract a bare number with no adjacent currency", () => {
    expect(priceRule.apply("الرحلة لمدة 3200 دقيقة تقريبًا").facts.price).toBeUndefined();
  });

  it("returns nothing for unrelated text (no fabrication)", () => {
    const r = priceRule.apply("رحلة جميلة إلى مكان رائع");
    expect(r.facts).toEqual({});
    expect(r.warnings).toEqual([]);
  });
});

/**
 * A second price stated with a bare "السعر" label used to be dropped, so the
 * offer's most expensive mistake — two different totals — was silently resolved
 * to the first one and shown as confirmed.
 */
describe("priceRule — a bare price label competes with the stated total", () => {
  it("keeps both when the second says only «السعر»", () => {
    expect(amounts("دبي ٤ ليالٍ. السعر الإجمالي 5,000 ريال. السعر 6,000 ريال.")).toEqual([
      5000, 6000,
    ]);
  });

  it("still confirms the explicitly final price, whichever comes first", () => {
    const r = priceRule.apply("دبي ٤ ليالٍ. السعر 6,000 ريال. السعر الإجمالي 5,000 ريال.");
    expect(r.facts.price?.value).toEqual({ amount: 5000, currency: "SAR" });
    expect(r.observations?.prices?.map((p) => p.amount)).toEqual([5000, 6000]);
  });

  it("competes with «التكلفة» and «المبلغ» too", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. التكلفة 7,000 ريال.")).toEqual([5000, 7000]);
    expect(amounts("السعر الإجمالي 5,000 ريال. المبلغ 7,000 ريال.")).toEqual([5000, 7000]);
  });

  it("competes even when no price is labelled final", () => {
    expect(amounts("السعر 5,000 ريال. السعر 6,000 ريال.")).toEqual([5000, 6000]);
  });

  it("reports the same amount written twice only once", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر ٥٠٠٠ ريال.")).toEqual([5000]);
  });
});

describe("priceRule — what must NOT be treated as a competing total", () => {
  it("an itemized component: «سعر الفندق» ends the clause with the component", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. سعر الفندق 3,000 ريال.")).toEqual([5000]);
  });

  it("an unlabelled component amount", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. الطيران 2,000 ريال.")).toEqual([5000]);
  });

  // English puts the component BEFORE the price word, where the clause-end
  // anchor cannot see it — so "Hotel price" needs its own rejection.
  it("an English component price, whose word order is the reverse of Arabic", () => {
    expect(amounts("Total price SAR 5,000. Hotel price SAR 3,000.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Flight cost SAR 2,000.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Ticket cost SAR 1,200.")).toEqual([5000]);
    expect(amounts("Total price SAR 5,000. Per-night price SAR 700.")).toEqual([5000, 700]);
    expect(amounts("Total price SAR 5,000. Hotel's price SAR 3,000.")).toEqual([5000]);
  });

  it("does not promote an English component total to the trip total", () => {
    const result = priceRule.apply("Hotel total: SAR 2,000.");
    expect(result.facts.totalPrice).toBeUndefined();
    expect(result.observations?.prices).toEqual([
      expect.objectContaining({ amount: 2000, currency: "SAR", basis: "unspecified" }),
    ]);
    expect(amounts("Total: SAR 5,000. Hotel total: SAR 2,000.")).toEqual([5000]);
  });

  it("but an English label naming the whole offer still competes", () => {
    expect(amounts("Total price SAR 5,000. Package price SAR 6,000.")).toEqual([5000, 6000]);
    expect(amounts("Total price SAR 5,000. Price SAR 6,000.")).toEqual([5000, 6000]);
  });

  it("a per-person rate beside a total", () => {
    const result = priceRule.apply("السعر الإجمالي 8,400 ريال. السعر 4,200 ريال للشخص.");
    expect(result.observations?.prices?.map(({ amount, basis }) => ({ amount, basis }))).toEqual([
      { amount: 8400, basis: "total" },
      { amount: 4200, basis: "per_person" },
    ]);
    expect(result.facts.totalPrice?.value).toEqual({ amount: 8400, currency: "SAR" });
    expect(result.facts.perPersonPrice?.value).toEqual({ amount: 4200, currency: "SAR" });
  });

  it("keeps a per-night rate separate from the trip total", () => {
    const result = priceRule.apply("Total price SAR 2,400. Price SAR 480 per night.");
    expect(result.facts.totalPrice?.value).toEqual({ amount: 2400, currency: "SAR" });
    expect(result.facts.perNightPrice?.value).toEqual({ amount: 480, currency: "SAR" });
    expect(result.facts.perPersonPrice).toBeUndefined();
  });

  it("keeps an Arabic per-night rate separate without inventing a total", () => {
    const result = priceRule.apply("السعر 480 ريال لليلة.");
    expect(result.facts.perNightPrice?.value).toEqual({ amount: 480, currency: "SAR" });
    expect(result.facts.totalPrice).toBeUndefined();
    expect(result.facts.perPersonPrice).toBeUndefined();
  });

  it("does not promote an unqualified stated price to a trip total", () => {
    const result = priceRule.apply("السعر 4,200 ريال.");
    expect(result.facts.statedPrice?.value).toEqual({ amount: 4200, currency: "SAR" });
    expect(result.facts.totalPrice).toBeUndefined();
  });

  it("adult and child rates, which legitimately differ", () => {
    expect(amounts("السعر 4,200 ريال للبالغ. السعر 2,500 ريال للطفل.")).toEqual([4200]);
    expect(amounts("Price USD 900 per adult. Price USD 500 per child.")).toEqual([900]);
  });

  it("the same price restated in another currency", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر 1,330 دولار.")).toEqual([5000]);
  });

  it("a cross-currency conflict between two FINAL prices is still reported", () => {
    expect(amounts("السعر الإجمالي 5,000 ريال. السعر الإجمالي 1,330 دولار.")).toEqual([
      5000, 1330,
    ]);
  });

  it("leaves a plain single-price offer untouched", () => {
    expect(amounts("باكج ماليزيا 5 ليالٍ. السعر 4,200 ريال شامل الطيران.")).toEqual([4200]);
    expect(amounts("الفندق 3,000 ريال والطيران 2,000 ريال.")).toEqual([3000]);
  });
});

describe("party-qualified totals", () => {
  const observations = (text: string) =>
    extractPriceObservations(text).map(({ amount, basis, evidence, party }) => ({
      amount,
      basis,
      evidence,
      party,
    }));

  it("reads a total label followed by its party as the trip total", () => {
    expect(observations("السعر الإجمالي للشخصين 18500 ريال.")).toEqual([
      { amount: 18500, basis: "total", evidence: "18500 ريال", party: { size: 2, evidence: "للشخصين" } },
    ]);
    expect(observations("الإجمالي لـ 3 أشخاص: 7,500 ريال.")).toEqual([
      { amount: 7500, basis: "total", evidence: "7,500 ريال", party: { size: 3, evidence: "لـ 3 أشخاص" } },
    ]);
    expect(observations("Total price for two people SAR 18,500.")).toEqual([
      { amount: 18500, basis: "total", evidence: "SAR 18,500", party: { size: 2, evidence: "for two people" } },
    ]);
    expect(observations("Total for 2 adults: SAR 19,600.")).toEqual([
      { amount: 19600, basis: "total", evidence: "SAR 19,600", party: { size: 2, evidence: "for 2 adults" } },
    ]);
  });

  it("reads a bare price stated for a party as that party's total", () => {
    expect(observations("السعر للشخصين 18500 ريال.")).toEqual([
      { amount: 18500, basis: "total", evidence: "18500 ريال", party: { size: 2, evidence: "للشخصين" } },
    ]);
    expect(observations("Price for both travellers SAR 18,500.")).toEqual([
      {
        amount: 18500,
        basis: "total",
        evidence: "SAR 18,500",
        party: { size: 2, evidence: "for both travellers" },
      },
    ]);
    expect(observations("الإجمالي لشخصين اثنين 18500 ريال.")[0]?.party).toEqual({
      size: 2,
      evidence: "لشخصين اثنين",
    });
  });

  it("reads a party suffix on a labelled price as a total, never a per-person rate", () => {
    expect(observations("والإجمالي 3,800 ريال للشخصين.")).toEqual([
      { amount: 3800, basis: "total", evidence: "3,800 ريال للشخصين", party: { size: 2, evidence: "للشخصين" } },
    ]);
    expect(observations("السعر 3,800 ريال للشخصين.")).toEqual([
      { amount: 3800, basis: "total", evidence: "3,800 ريال للشخصين", party: { size: 2, evidence: "للشخصين" } },
    ]);
    expect(observations("السعر 1,900 ريال للشخص.")).toEqual([
      { amount: 1900, basis: "per_person", evidence: "1,900 ريال للشخص", party: undefined },
    ]);
  });

  it("does not promote a component price or an unlabelled amount to the trip total", () => {
    expect(observations("Hotel total for two SAR 3,000.")[0]?.basis).not.toBe("total");
    expect(observations("Hotel price for two people SAR 3,000.")[0]?.basis).not.toBe("total");
    expect(observations("سعر الفندق للشخصين 3,000 ريال.")[0]?.basis).not.toBe("total");
    expect(observations("الفندق 3,000 ريال للشخصين.")[0]?.basis).not.toBe("total");
  });

  it("needs a person noun and a clause end before trusting a party", () => {
    for (const text of [
      "Total SAR 4,000 for two weeks.",
      "Total SAR 4,000 for two nights.",
      "Total SAR 4,000 for both flights.",
      "Total SAR 6,000 for two rooms.",
      "Total for both: SAR 13,000.",
      "price for both: SAR 5,000.",
    ]) {
      expect(observations(text)[0]?.party, text).toBeUndefined();
    }
    // A party followed by other words is not the whole group.
    expect(observations("الإجمالي 3,000 ريال للشخصين في غرفة مزدوجة.")).toEqual([
      { amount: 3000, basis: "total", evidence: "3,000 ريال", party: undefined },
    ]);
  });

  it("keeps a party's nightly or per-room rate out of the totals", () => {
    for (const text of [
      "السعر 1,200 ريال للشخصين في الليلة.",
      "الإجمالي 1,200 ريال للشخصين لليلة.",
      "الإجمالي 5000 ريال لـ 2 أشخاص لكل ليلة.",
      "Price SAR 1,200 for two people per night.",
      "Price for two people SAR 1,200/night.",
      "السعر للشخصين 1,200 ريال/ليلة.",
      "السعر 1,900 ريال للشخصين/الليلة.",
    ]) {
      expect(observations(text).map((price) => price.basis), text).toEqual(["per_night"]);
    }
    expect(
      observations("السعر 2,500 ريال للشخص. السعر 1,800 ريال للشخصين للغرفة.").map(
        (price) => price.basis
      )
    ).toEqual(["per_person"]);
    expect(observations("Price SAR 1,800 for two people per room.")[0]?.basis).not.toBe("total");
  });

  it("records a mixed group as a party without an exact size", () => {
    expect(observations("Total SAR 30,000 for 2 adults and 2 children.")).toEqual([
      {
        amount: 30000,
        basis: "total",
        evidence: "SAR 30,000 for 2 adults",
        party: { size: null, evidence: "for 2 adults" },
      },
    ]);
    expect(observations("الإجمالي 15000 ريال للشخصين مع طفل.")[0]?.party).toEqual({
      size: null,
      evidence: "للشخصين",
    });
    expect(observations("Total SAR 2,500 for two people, and a child.")[0]?.party).toEqual({
      size: null,
      evidence: "for two people",
    });
  });

  it("does not read a party written with harakat as a per-person rate", () => {
    expect(observations("الإجمالي 3,800 ريال للشخصَين.")[0]?.basis).toBe("total");
  });

  it("leaves an ambiguous plural party unqualified", () => {
    // «للمسافرين» may be plural, so it carries no exact head count.
    expect(observations("السعر الإجمالي للمسافرين 18500 ريال.")[0]?.party).toBeUndefined();
    expect(observations("Total for 6 nights SAR 5,000.")[0]?.party).toBeUndefined();
  });
});

describe("Arabic trip totals and subtotals", () => {
  it.each([
    ["إجمالي مبلغ الرحلة: 16,400 ريال", 16400],
    ["إجمالي الباقة 9,000 ريال", 9000],
    ["المبلغ الإجمالي: 7,250 ريال", 7250],
    ["الإجمالي الكلي: 5,000 ريال", 5000],
    ["الإجمالي النهائي: 5,000 ريال", 5000],
    ["*إجمالي الرحلة لشخصين: 5,000 ريال*", 5000],
  ])("reads %s as the trip total", (text, amount) => {
    expect(priceRule.apply(text).facts.totalPrice?.value.amount).toBe(amount);
  });

  it("keeps itemized subtotals apart from the trip total", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 14,400 ريال\nإجمالي الطيران: 3,000 ريال\nإجمالي مبلغ الرحلة: 17,400 ريال"
    );
    expect(r.facts.totalPrice?.value.amount).toBe(17400);
    expect(r.facts.statedPrice).toBeUndefined();
    expect(r.observations?.priceComponents?.map((p) => p.amount)).toEqual([14400, 3000]);
  });

  it("does not read a subtotal as the trip total", () => {
    expect(priceRule.apply("إجمالي الإقامة: 14,400 ريال").facts.totalPrice).toBeUndefined();
  });

  it("uses only the summary block right above the total", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 5,000 ريال\nجولة بحرية مشمولة\n\nالملخص:\nإجمالي الإقامة: 5,000 ريال\n\nإجمالي المواصلات: 1,000 ريال\nإجمالي مبلغ الرحلة: 6,000 ريال"
    );
    expect(r.observations?.priceComponents?.map((p) => p.amount)).toEqual([5000, 1000]);
  });

  it("returns no breakdown when a label repeats inside the summary block", () => {
    const r = priceRule.apply(
      "Hotel total: SAR 5,000\nHotel total: SAR 5,000\nTransfers total: SAR 1,000\nTrip total: SAR 11,000"
    );
    expect(r.observations?.priceComponents).toBeUndefined();
  });

  it("finds the summary block under a total repeated later in the offer", () => {
    const r = priceRule.apply(
      "إجمالي مبلغ الرحلة: 6,000 ريال\nتفاصيل الباقة\n\nإجمالي الإقامة: 5,000 ريال\nإجمالي المواصلات: 1,500 ريال\nإجمالي مبلغ الرحلة: 6,000 ريال"
    );
    expect(r.observations?.priceComponents?.map((p) => p.amount)).toEqual([5000, 1500]);
  });

  it("keeps a per-person subtotal out of the package prices and the sum check", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 2,000 ريال للشخص\nإجمالي المواصلات: 1,000 ريال\nإجمالي مبلغ الرحلة: 5,000 ريال"
    );
    expect(r.facts.perPersonPrice).toBeUndefined();
    expect(r.facts.totalPrice?.value.amount).toBe(5000);
    expect(r.observations?.priceComponents).toBeUndefined();
  });

  it("looks past an incomplete block above an earlier total", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 5,000 ريال\nإجمالي مبلغ الرحلة: 6,000 ريال\nتفاصيل\n\nإجمالي الإقامة: 5,000 ريال\nإجمالي المواصلات: 1,500 ريال\nإجمالي مبلغ الرحلة: 6,000 ريال"
    );
    expect(r.observations?.priceComponents?.map((p) => p.amount)).toEqual([5000, 1500]);
  });

  it.each(["Accommodation total", "Resort total", "Stay total"])(
    "reads «%s» as a subtotal, not the trip total",
    (label) => {
      const r = priceRule.apply(`${label}: SAR 5,000\nTransfers total: SAR 1,000\nTrip total: SAR 6,000`);
      expect(r.facts.totalPrice?.value.amount).toBe(6000);
      expect(r.observations?.prices?.map((p) => p.amount)).toEqual([6000]);
      expect(r.observations?.priceComponents?.map((p) => p.amount)).toEqual([5000, 1000]);
    }
  );

  it.each(["SIM cards total", "Car rental total", "Airport pickup total", "Sub-total", "Spa's total"])(
    "reads «%s», a part not on any list, as a subtotal",
    (label) => {
      const r = priceRule.apply(`${label}: SAR 1,000\nTrip total: SAR 6,000`);
      expect(r.facts.totalPrice?.value.amount).toBe(6000);
      expect(r.observations?.prices?.map((p) => p.amount)).toEqual([6000]);
    }
  );

  it.each([
    "Trip total",
    "Package total",
    "Grand total",
    "Overall total",
    "Final total",
    "Offer total",
    "Holiday total",
    "The total",
    "6 nights total",
    "2 adults total",
  ])("still reads «%s» as the trip total", (label) => {
    const r = priceRule.apply(`${label}: SAR 6,000`);
    expect(r.facts.totalPrice?.value).toEqual({ amount: 6000, currency: "SAR" });
  });

  it("still lets two whole-trip totals compete", () => {
    expect(amounts("Package total: SAR 6,000\nGrand total: SAR 6,500")).toEqual([6000, 6500]);
  });

  it("returns no breakdown when the subtotals are not next to the total", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 5,000 ريال\nإجمالي المواصلات: 1,000 ريال\nتشمل الباقة جولة بحرية\nإجمالي مبلغ الرحلة: 6,500 ريال"
    );
    expect(r.observations?.priceComponents).toBeUndefined();
  });

  it("returns no breakdown when one subtotal is stated with two amounts", () => {
    const r = priceRule.apply(
      "إجمالي الإقامة: 5,000 ريال\nإجمالي المواصلات: 1,000 ريال\nإجمالي الإقامة: 5,500 ريال\nإجمالي مبلغ الرحلة: 6,000 ريال"
    );
    expect(r.observations?.priceComponents).toBeUndefined();
  });
});

describe("qualified English totals", () => {
  it.each(["Estimated total", "Net total"])(
    "reads «%s» as the trip total when no other trip total is stated",
    (label) => {
      const r = priceRule.apply(`Hotel price SAR 1,000\n${label}: SAR 6,000`);
      expect(r.facts.totalPrice?.value.amount).toBe(6000);
      expect(r.facts.price?.value.amount).toBe(6000);
    }
  );

  it("reads a qualified total as a part beside an unqualified trip total", () => {
    const r = priceRule.apply("SIM cards total: SAR 200\nTrip total: SAR 6,000");
    expect(r.facts.totalPrice?.value.amount).toBe(6000);
    expect(r.observations?.prices?.map((p) => p.amount)).toEqual([6000]);
  });

  it("never promotes a qualified per-unit amount to the trip total", () => {
    expect(priceRule.apply("Estimated total: SAR 6,000 per adult").facts.totalPrice).toBeUndefined();
  });
});
