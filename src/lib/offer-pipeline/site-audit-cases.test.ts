/**
 * Synthetic offers from the 2026-10-19 independent site audit (cases 1–13).
 * Each case pins what the offer states explicitly: an exclusion, a transit
 * point, a total that does not add up. Cases the audit found correct are
 * pinned too, so a fix cannot silently undo them.
 */

import { describe, expect, it } from "vitest";
import { runOfferPipeline } from "./pipeline";

async function run(text: string) {
  const result = await runOfferPipeline({ type: "text", text });
  if (result.status !== "ok") throw new Error(`pipeline ${result.status}`);
  return { facts: result.extraction.facts, analysis: result.analysis };
}

const codes = (analysis: Awaited<ReturnType<typeof run>>["analysis"]) =>
  analysis.contradictions.map(({ code }) => code);

describe("audit case 1 — complete Dubai package", () => {
  it("extracts the package and finds no contradiction", async () => {
    const { facts, analysis } = await run(
      "عرض دبي 5 ليالٍ لشخصين في فندق 4 نجوم شامل الإفطار وتذاكر الطيران. السعر الإجمالي 8,500 ريال."
    );
    expect(facts.destination?.value.canonicalValue).toBe("Dubai");
    expect(facts.board?.value).toBe("BB");
    expect(facts.flight?.value).toEqual({ included: true });
    expect(analysis.contradictions).toEqual([]);
  });
});

describe("audit case 2 — «الإفطار غير شامل»", () => {
  it("records breakfast as excluded, not as unstated", async () => {
    const { facts } = await run(
      "باقة إسطنبول 4 ليالٍ في فندق في تقسيم، السعر 3,200 ريال للشخص، لشخصين، الإفطار غير شامل."
    );
    expect(facts.board?.value).toBe("RO");
    expect(facts.board?.evidence).toContain("الإفطار غير شامل");
  });
});

describe("audit case 3 — itemised prices that exceed the total", () => {
  it("flags flight + hotel ≠ total", async () => {
    const { analysis } = await run("عرض لندن 5 ليالٍ: الطيران 2,000 ريال + الفندق 3,000 ريال، الإجمالي 4,000 ريال.");
    expect(codes(analysis)).toContain("price_components_mismatch");
  });
});

describe("audit case 4 — Maldives transfer payable on arrival", () => {
  it("records the transfer as not included", async () => {
    const { facts } = await run(
      "عرض المالديف 4 ليالٍ، فيلا مائية، السعر 12,000 ريال. رسوم إضافية تطبق، الضرائب حسب الفندق، النقل البحري يُدفع عند الوصول."
    );
    expect(facts.transfer?.value).toEqual({ included: false });
    expect(facts.transfer?.evidence).toContain("يُدفع عند الوصول");
  });
});

describe("audit case 5 — flight via Istanbul with an airport change", () => {
  const TEXT =
    "تذكرة الرياض–باريس عبر إسطنبول، توقف 14 ساعة، الوصول إلى مطار صبيحة والمغادرة من مطار إسطنبول، الأمتعة 20 كجم، التذكرة غير قابلة للاسترداد. السعر 3,100 ريال.";

  it("reports Paris, never the transit city, as the destination", async () => {
    const { facts } = await run(TEXT);
    expect(facts.destination?.value.canonicalValue).toBe("Paris");
  });

  it("records the 14-hour stop and the airport change", async () => {
    const { facts } = await run(TEXT);
    expect(facts.transitDuration?.value).toEqual({ minutes: 840 });
    expect(facts.airportChange?.value).toBe(true);
    expect(facts.airportChange?.evidence).toContain("مطار صبيحة");
  });

  it("records the non-refundable ticket", async () => {
    const { facts } = await run(TEXT);
    expect(facts.cancellationPolicy?.value).toContain("غير قابلة للاسترداد");
  });
});

describe("audit case 6 — Bali via Kuala Lumpur", () => {
  it("reports Bali and reads breakfast and taxes", async () => {
    const { facts } = await run(
      "Bali 6 nights, 2 adults, private villa, breakfast included, flights via Kuala Lumpur, SAR 14,500 total, taxes not included."
    );
    expect(facts.destination?.value.canonicalValue).toBe("Bali");
    expect(facts.board?.value).toBe("BB");
    expect(facts.taxes?.value).toEqual({ included: false });
  });
});

describe("audit case 9 — consistent nightly price", () => {
  it("finds no contradiction when 3 × 750 = 2,250", async () => {
    const { facts, analysis } = await run("القاهرة 3 ليالٍ، سعر الليلة 750 ريال، المجموع 2,250 ريال، نصف إقامة.");
    expect(facts.board?.value).toBe("HB");
    expect(analysis.contradictions).toEqual([]);
  });
});

describe("audit case 10 — nightly price that does not add up", () => {
  it("flags 4 × 400 ≠ 2,000", async () => {
    const { analysis } = await run("باكو 4 ليالٍ، سعر الليلة 400 ريال، المجموع 2,000 ريال.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });
});

describe("audit case 12 — per-person price against the total", () => {
  it("still flags 2 × 3,000 ≠ 5,000 as critical", async () => {
    const { analysis } = await run("باقة جورجيا 3,000 ريال للشخص، لشخصين، الإجمالي 5,000 ريال.");
    expect(analysis.contradictions.find(({ code }) => code === "price_total_mismatch")?.severity).toBe("critical");
  });
});

describe("audit case 13 — English exclusions", () => {
  it("records breakfast and transfers as excluded", async () => {
    const { facts } = await run(
      "Bali 5 nights, breakfast not included, transfers not included, SAR 9,000 including taxes, free cancellation."
    );
    expect(facts.destination?.value.canonicalValue).toBe("Bali");
    expect(facts.board?.value).toBe("RO");
    expect(facts.transfer?.value).toEqual({ included: false });
    expect(facts.taxes?.value).toEqual({ included: true });
  });
});

describe("guards around the audit fixes", () => {
  it("reads a dashed route only from a Saudi departure city", async () => {
    expect((await run("جدة - إسطنبول، 4 ليالٍ، السعر 2,900 ريال.")).facts.destination?.value.canonicalValue).toBe("Istanbul");
    expect((await run("Dubai - Burj Khalifa tour, 3 nights, SAR 4,000.")).facts.destination?.value.canonicalValue).toBe("Dubai");
  });

  it("skips a transit city named in English", async () => {
    expect((await run("Maldives 5 nights via Dubai, USD 3,000 total.")).facts.destination?.value.canonicalValue).toBe("Maldives");
  });

  it("treats «مطار دبي الدولي» and «مطار دبي» as one airport", async () => {
    const { facts } = await run("رحلة عبر دبي، الوصول إلى مطار دبي الدولي والمغادرة من مطار دبي، السعر 2,000 ريال.");
    expect(facts.airportChange).toBeUndefined();
  });

  it("does not add up amounts that are not joined by a plus sign", async () => {
    const { analysis } = await run("عرض لندن 5 ليالٍ: الطيران 2,000 ريال، الفندق 3,000 ريال، الإجمالي 4,000 ريال.");
    expect(codes(analysis)).not.toContain("price_components_mismatch");
  });

  it("does not compare a nightly rate when the total includes flights", async () => {
    const { analysis } = await run("باكو 4 ليالٍ شامل الطيران، سعر الليلة 400 ريال، المجموع 2,000 ريال.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });
});

describe("review follow-ups", () => {
  it("does not call the board room-only when another meal is mentioned", async () => {
    const { facts } = await run("Istanbul 4 nights, breakfast not included, dinner included, SAR 3,000 total.");
    expect(facts.board?.value).not.toBe("RO");
  });

  it("keeps a 14-hour stop when ground transport is mentioned in another clause", async () => {
    const { facts } = await run("رحلة عبر إسطنبول، توقف 14 ساعة، تشمل المواصلات من المطار، السعر 3,000 ريال.");
    expect(facts.transitDuration?.value).toEqual({ minutes: 840 });
  });

  it("reads a time after the airport name as the same airport", async () => {
    const { facts } = await run("رحلة عبر دبي، الوصول إلى مطار دبي والمغادرة من مطار دبي مساءً في اليوم التالي، السعر 2,000 ريال.");
    expect(facts.airportChange).toBeUndefined();
  });
});

describe("second review follow-ups", () => {
  it("keeps an included transfer when another amount is paid on arrival", async () => {
    const { facts } = await run("Dubai 4 nights, airport transfers included, balance paid on arrival, SAR 4,000 total.");
    expect(facts.transfer?.value).toEqual({ included: true });
  });

  it("reads Dubai International and Al Maktoum as two airports", async () => {
    const { facts } = await run("رحلة عبر دبي، الوصول إلى مطار دبي الدولي والمغادرة من مطار دبي آل مكتوم، السعر 2,000 ريال.");
    expect(facts.airportChange?.value).toBe(true);
  });

  it("does not compare a nightly rate when the total includes a transfer", async () => {
    const { analysis } = await run("باكو 4 ليالٍ، سعر الليلة 400 ريال، شامل الاستقبال والتوديع من المطار، المجموع 2,000 ريال.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });
});

describe("nightly check and rooms", () => {
  it("does not multiply a per-room rate by nights alone", async () => {
    const { analysis } = await run("Dubai, 2 rooms, 4 nights, nightly price SAR 400 per room, total SAR 3,200.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });

  it("does not compare a nightly rate in an offer for several rooms", async () => {
    const { analysis } = await run("باكو 4 ليالٍ، 3 غرف، سعر الليلة 400 ريال، المجموع 4,800 ريال.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });
});

describe("third review follow-ups", () => {
  it("does not read a sightseeing stop in another sentence as a flight transit", async () => {
    const { facts } = await run("رحلة إلى دبي عبر إسطنبول. توقف عند برج خليفة لمدة 3 ساعات. السعر 4,000 ريال.");
    expect(facts.transitDuration).toBeUndefined();
  });

  it("does not take a hotel's own size as the rooms booked", async () => {
    const { analysis } = await run("Hotel with 200 rooms, 4 nights, nightly price SAR 400, total SAR 2,000.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });
});

describe("fourth review follow-ups", () => {
  it("keeps a destination that later appears after a transit-like word", async () => {
    const { facts } = await run("Dubai 5 nights, guided tour through Dubai old town, SAR 5,000 total.");
    expect(facts.destination?.value.canonicalValue).toBe("Dubai");
  });

  it("stops a sightseeing stop after an exclamation mark from counting as transit", async () => {
    const { facts } = await run("رحلة إلى دبي عبر إسطنبول! توقف في الفندق لمدة 3 ساعات. السعر 4,000 ريال.");
    expect(facts.transitDuration).toBeUndefined();
  });

  it("stops an airport name before a terminal qualifier", async () => {
    const { facts } = await run("رحلة عبر دبي، الوصول إلى مطار دبي الدولي عبر الصالة 1 والمغادرة من مطار دبي الدولي، السعر 2,000 ريال.");
    expect(facts.airportChange).toBeUndefined();
  });
});

describe("fifth review follow-ups", () => {
  it("does not read a hotel stop in a routed-flight sentence as transit", async () => {
    const { facts } = await run("رحلة إلى دبي عبر إسطنبول، توقف في الفندق لمدة 3 ساعات، السعر 4,000 ريال.");
    expect(facts.transitDuration).toBeUndefined();
  });

  it("does not compare a nightly rate when meals are included", async () => {
    const { analysis } = await run("4 nights; nightly room rate SAR 400; breakfast included; breakfast total SAR 200; package total SAR 1,800.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });

  it("does not take a hotel's small inventory as the rooms booked", async () => {
    const { analysis } = await run("Boutique hotel offers 5 rooms, 4 nights, nightly price SAR 400, total SAR 2,000.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });
});

describe("sixth review follow-ups", () => {
  it("keeps a destination named only after a sightseeing 'through'", async () => {
    const { facts } = await run("5 nights with a guided tour through Dubai old town, SAR 5,000 total.");
    expect(facts.destination?.value.canonicalValue).toBe("Dubai");
  });

  it("keeps an included transfer when the hotel is paid on arrival", async () => {
    const { facts } = await run("Dubai 4 nights, airport transfers included and hotel paid on arrival, SAR 4,000 total.");
    expect(facts.transfer?.value).toEqual({ included: true });
  });

  it("does not multiply one stay's nightly rate by the whole package", async () => {
    const { analysis } = await run("7 nights total; Hotel A: 4 nights, nightly price SAR 400; Hotel B: 3 nights; package total SAR 3,000.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });
});

describe("seventh review follow-ups", () => {
  it("does not count a cancellation deadline as a second stay", async () => {
    const { analysis } = await run("Dubai 4 nights, nightly price SAR 400, total SAR 2,000, cancellation up to 1 night before arrival.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });

  it("reads an explicitly booked room count above nine", async () => {
    const { analysis } = await run("Dubai, book 10 rooms, 4 nights, nightly price SAR 400, total SAR 16,000.");
    expect(codes(analysis)).not.toContain("price_nightly_mismatch");
  });
});

describe("eighth review follow-ups", () => {
  it("reads a routed stop written in Arabic-Indic digits", async () => {
    const { facts } = await run("رحلة عبر إسطنبول، توقف ١٤ ساعة، السعر ٣٬١٠٠ ريال.");
    expect(facts.transitDuration?.value).toEqual({ minutes: 840 });
  });

  it("does not count a cancellation penalty as a second stay", async () => {
    const { analysis } = await run("Dubai 4 nights, nightly price SAR 400, total SAR 2,000, late cancellation penalty: 1 night.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });
});

describe("ninth review follow-ups", () => {
  it("reads a route joined by an unspaced hyphen", async () => {
    for (const text of ["رحلة الرياض-باريس 5 ليالٍ، السعر 6,000 ريال.", "Flight Riyadh-Paris, 5 nights, SAR 6,000 total."]) {
      const { facts } = await run(text);
      expect(facts.destination?.value.canonicalValue, text).toBe("Paris");
    }
  });

  it("does not read «و» as part of an airport name", async () => {
    const { facts } = await run("الوصول إلى مطار دبي و المغادرة من مطار دبي، 4 ليالٍ، السعر 4,000 ريال.");
    expect(facts.airportChange?.value).not.toBe(true);
  });

  it("counts one stay restated under the same name once", async () => {
    const { analysis } = await run("Hotel A: 4 nights; Hotel A stay: 4 nights; nightly price SAR 400; total SAR 2,000.");
    expect(codes(analysis)).toContain("price_nightly_mismatch");
  });
});

describe("tenth review follow-ups", () => {
  it("reads a routed stop with the duration written first", async () => {
    const { facts } = await run("رحلة عبر إسطنبول، 14 ساعة توقف، السعر 3,100 ريال.");
    expect(facts.transitDuration?.value).toEqual({ minutes: 840 });
  });

  it("reads a spelled-out booked room count", async () => {
    for (const text of [
      "Dubai, book six rooms, 4 nights, nightly price SAR 400, total SAR 9,600.",
      "دبي، حجز ست غرف، 4 ليالٍ، سعر الليلة 400 ريال، الإجمالي 9,600 ريال.",
    ]) {
      const { analysis } = await run(text);
      expect(codes(analysis), text).not.toContain("price_nightly_mismatch");
    }
  });
});

describe("eleventh review follow-ups", () => {
  it("does not add per-traveller rates as itemised parts of the total", async () => {
    const { analysis } = await run("2 adults and 1 child: SAR 2,000 per adult + SAR 1,000 per child, total SAR 5,000.");
    expect(codes(analysis)).not.toContain("price_components_mismatch");
  });

  it("does not read a hotel stop on a routed flight as transit", async () => {
    const { facts } = await run("رحلة إلى دبي عبر إسطنبول، توقف 3 ساعات في الفندق، السعر 4,000 ريال.");
    expect(facts.transitDuration).toBeUndefined();
  });

  it("reads a vocalised airport name as the same airport", async () => {
    const { facts } = await run("الوصول إلى مطار دُبي والمغادرة من مطار دبي، 4 ليالٍ، السعر 4,000 ريال.");
    expect(facts.airportChange?.value).not.toBe(true);
  });
});

describe("twelfth review follow-ups", () => {
  it("does not read a stop placed in town as the routed flight's stop", async () => {
    const { facts } = await run("رحلة إلى دبي عبر إسطنبول، توقف 3 ساعات في وسط المدينة، السعر 4,000 ريال.");
    expect(facts.transitDuration).toBeUndefined();
  });

  it("still reads a routed stop spent at the airport", async () => {
    const { facts } = await run("رحلة عبر إسطنبول، توقف 14 ساعة في المطار، السعر 3,100 ريال.");
    expect(facts.transitDuration?.value).toEqual({ minutes: 840 });
  });

  it("does not take a transit city's qualified airport as the destination", async () => {
    const { facts } = await run("Paris 5 nights, flight via Istanbul, transfer at Istanbul International Airport, SAR 6,000 total.");
    expect(facts.destination?.value.canonicalValue).toBe("Paris");
  });
});

describe("thirteenth review follow-ups", () => {
  it("does not read an airport named once by code as a change", async () => {
    const { facts } = await run("Riyadh 4 nights: arrive at King Khalid International Airport and depart from RUH Airport, SAR 4,000 total.");
    expect(facts.airportChange?.value).not.toBe(true);
  });

  it("still reads two different named airports as a change", async () => {
    const { facts } = await run("الوصول إلى مطار صبيحة والمغادرة من مطار إسطنبول، 4 ليالٍ، السعر 4,000 ريال.");
    expect(facts.airportChange?.value).toBe(true);
  });

  it("does not add a negative discount to a plus-joined breakdown", async () => {
    const { analysis } = await run("Flight SAR 2,000 + Hotel SAR 3,000 + Discount -SAR 1,000, total SAR 4,000.");
    expect(codes(analysis)).not.toContain("price_components_mismatch");
  });
});

describe("fourteenth review follow-ups", () => {
  it("does not take a transit city's country as the destination", async () => {
    for (const text of ["Flight via Istanbul, Turkey, layover 2 hours, SAR 3,000.", "رحلة عبر إسطنبول، تركيا، ترانزيت ساعتين، السعر 3,000 ريال."]) {
      const { facts } = await run(text);
      expect(facts.destination?.value.canonicalValue, text).not.toBe("Turkey");
    }
  });

  it("still takes a country named on its own as the destination", async () => {
    const { facts } = await run("Turkey 5 nights, flight via Doha, SAR 6,000 total.");
    expect(facts.destination?.value.canonicalValue).toBe("Turkey");
  });

  it("reads two different airport codes as a change", async () => {
    const { facts } = await run("New York 4 nights: arrive at JFK Airport and depart from LGA Airport, SAR 9,000 total.");
    expect(facts.airportChange?.value).toBe(true);
  });
});

describe("fifteenth review follow-ups", () => {
  it("leaves an airport change unresolved when the text contradicts itself", async () => {
    const { facts } = await run("New York 4 nights, no airport change: arrive at JFK Airport and depart from LGA Airport, SAR 9,000 total.");
    expect(facts.airportChange).toBeUndefined();
  });

  it("still reads a plain no-change statement", async () => {
    const { facts } = await run("New York 4 nights, no airport change, SAR 9,000 total.");
    expect(facts.airportChange?.value).toBe(false);
  });
});

describe("sixteenth review follow-ups", () => {
  it("keeps a destination that starts the next line after a transit city", async () => {
    const { facts } = await run("Flight via Istanbul\nTurkey — 5 nights, SAR 6,000 total.");
    expect(facts.destination?.value.canonicalValue).toBe("Turkey");
  });
});

describe("seventeenth review follow-ups", () => {
  it("leaves a claimed airport change unresolved when the same airport is named twice", async () => {
    const { facts } = await run("New York 4 nights, requires an airport change: arrive at JFK Airport and depart from JFK Airport, SAR 9,000 total.");
    expect(facts.airportChange).toBeUndefined();
  });

  it("reads airport names longer than three words", async () => {
    const { facts } = await run("New York 4 nights: arrive at John F Kennedy International Airport and depart from LaGuardia Airport, SAR 9,000 total.");
    expect(facts.airportChange?.value).toBe(true);
  });
});

describe("eighteenth review follow-ups", () => {
  it("ties a country to a transit city named with its airport", async () => {
    const { facts } = await run("Flight via Istanbul International Airport, Turkey, layover 2 hours, SAR 3,000.");
    expect(facts.destination?.value.canonicalValue).not.toBe("Turkey");
  });

  it("reads a dotted initial as the same airport name", async () => {
    const { facts } = await run("New York 4 nights: arrive at John F. Kennedy International Airport and depart from John F Kennedy Airport, SAR 9,000 total.");
    expect(facts.airportChange?.value).not.toBe(true);
  });
});

describe("nineteenth review follow-ups", () => {
  it("does not take a transit city named through its airport as the destination", async () => {
    for (const text of ["Paris 5 nights, flight via the Istanbul airport, SAR 6,000 total.", "باريس 5 ليالٍ، الطيران عبر مطار إسطنبول، السعر 6,000 ريال."]) {
      const { facts } = await run(text);
      expect(facts.destination?.value.canonicalValue, text).toBe("Paris");
    }
  });

  it("reads room only when every meal is excluded", async () => {
    const { facts } = await run("Dubai 4 nights. Breakfast not included; lunch and dinner not included. SAR 3,000 total.");
    expect(facts.board?.value).toBe("RO");
  });

  it("still withholds room only when another meal is included", async () => {
    const { facts } = await run("Dubai 4 nights. Breakfast not included; dinner included. SAR 3,000 total.");
    expect(facts.board?.value).not.toBe("RO");
  });

  it("does not add prefix-labelled traveller rates as parts of the total", async () => {
    const { analysis } = await run("2 adults and 1 child: Adult SAR 2,000 + Child SAR 1,000, total SAR 5,000.");
    expect(codes(analysis)).not.toContain("price_components_mismatch");
  });
});

describe("twentieth review follow-ups", () => {
  it("does not add fare-labelled traveller rates as parts of the total", async () => {
    const { analysis } = await run("2 adults and 1 child: Adult fare SAR 2,000 + Child fare SAR 1,000, total SAR 5,000.");
    expect(codes(analysis)).not.toContain("price_components_mismatch");
  });
});
