import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAUDI_AIRPORTS } from "./config";
import { sampleFeed } from "./fixtures";
import { normalizeFeed } from "./normalize";
import { FEED_RETRIES, FEED_REVALIDATE_SECONDS, selectProvider } from "./providers";
import { getAirportStatusSnapshot, resetAirportStatusCache } from "./service";
import { STATUS_LABEL_AR, formatRiyadh, isStale, statusFromMetrics } from "./status";
import type { AirportStatusSnapshot } from "./types";
import { buildAirportView } from "./view";

const NOW = new Date("2026-10-16T09:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();
const TRACKER = { name: "Flightradar24", url: "https://www.flightradar24.com/data/airport-disruption", type: "flight_tracker" };
const GACA_NOTICE = { name: "GACA", url: "https://www.gaca.gov.sa/notice/1", type: "civil_aviation_authority" };

function rec(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    airportCode: "RUH",
    airportNameAr: "مطار الملك خالد الدولي",
    cityAr: "الرياض",
    countryCode: "SA",
    operationalStatus: "normal",
    source: TRACKER,
    observedAt: ago(12),
    fetchedAt: ago(10),
    ...over,
  };
}
const norm = (records: unknown[], allowSamples = false) => normalizeFeed({ records }, { now: NOW, allowSamples });

function snapshot(records: unknown[], over: Partial<AirportStatusSnapshot> = {}): AirportStatusSnapshot {
  const feed = norm(records);
  return {
    mode: "manual_feed",
    live: false,
    records: feed.records,
    conflicts: feed.conflicts,
    lastSuccessfulUpdate: feed.lastFetchedAt,
    refreshFailed: false,
    issues: feed.issues,
    ...over,
  };
}
const view = (records: unknown[], over: Partial<AirportStatusSnapshot> = {}) => buildAirportView(snapshot(records, over), NOW);

describe("status vocabulary", () => {
  it("uses the exact Arabic labels", () => {
    expect(STATUS_LABEL_AR).toEqual({
      normal: "يعمل بشكل طبيعي",
      minor_delays: "تأخيرات محدودة",
      major_disruption: "اضطراب مرتفع",
      suspended: "عمليات متوقفة",
      unavailable: "البيانات غير متاحة",
    });
  });

  it("formats times as Gregorian Asia/Riyadh with Latin digits", () => {
    // 09:00Z is 12:00 in Riyadh (UTC+3, no DST).
    const s = formatRiyadh("2026-10-16T09:00:00Z");
    expect(s).toMatch(/16/);
    expect(s).toMatch(/أكتوبر/);
    expect(s).toMatch(/12:00/);
    expect(s).not.toMatch(/[٠-٩]/);
    expect(formatRiyadh("2026-10-16T22:30:00Z")).toMatch(/17/); // next day in Riyadh
  });

  it("is stale after expiresAt, or three hours after observedAt by default", () => {
    expect(isStale({ observedAt: ago(170) }, NOW)).toBe(false);
    expect(isStale({ observedAt: ago(190) }, NOW)).toBe(true);
    expect(isStale({ observedAt: ago(30), expiresAt: ago(1) }, NOW)).toBe(true);
    expect(isStale({ observedAt: ago(300), expiresAt: ago(-60) }, NOW)).toBe(false);
  });
});

describe("normalization", () => {
  it("maps a complete record to the normalized model", () => {
    const { records, issues } = norm([
      rec({
        airportCode: "JED",
        airportNameAr: "مطار الملك عبدالعزيز الدولي",
        cityAr: "جدة",
        operationalStatus: "minor_delays",
        delayPercentage: 22.5,
        cancellationPercentage: 2,
        averageDelayMinutes: 25,
        cancelledFlights: 4,
        statusMessageAr: "تأخيرات في صالة الرحلات الدولية",
        passengerActionAr: "احضر مبكرًا",
        airlineStatus: { name: "Saudia", url: "https://www.saudia.com/flight-status" },
        expiresAt: ago(-60),
        confidence: "medium",
      }),
    ]);
    expect(issues).toEqual([]);
    expect(records[0]).toEqual({
      airportCode: "JED",
      airportNameAr: "مطار الملك عبدالعزيز الدولي",
      cityAr: "جدة",
      countryCode: "SA",
      region: "saudi",
      operationalStatus: "minor_delays",
      delayPercentage: 22.5,
      cancellationPercentage: 2,
      averageDelayMinutes: 25,
      cancelledFlights: 4,
      statusMessageAr: "تأخيرات في صالة الرحلات الدولية",
      passengerActionAr: "احضر مبكرًا",
      airlineStatus: { name: "Saudia", url: "https://www.saudia.com/flight-status" },
      source: TRACKER,
      observedAt: ago(12),
      fetchedAt: ago(10),
      expiresAt: ago(-60),
      confidence: "medium",
    });
  });

  it("derives region from the country code and confidence from the source type", () => {
    const { records } = norm([
      rec({ airportCode: "LHR", countryCode: "GB", source: { ...GACA_NOTICE, type: "official_airport" } }),
      rec({ airportCode: "AHB" }),
    ]);
    expect(records.find((r) => r.airportCode === "LHR")).toMatchObject({ region: "global", confidence: "high" });
    expect(records.find((r) => r.airportCode === "AHB")).toMatchObject({ region: "saudi", confidence: "medium" });
  });

  it("derives a status from figures when none is given", () => {
    expect(norm([rec({ operationalStatus: undefined, delayPercentage: 50 })]).records[0].operationalStatus).toBe("major_disruption");
    expect(norm([rec({ operationalStatus: undefined, averageDelayMinutes: 25 })]).records[0].operationalStatus).toBe("minor_delays");
    expect(norm([rec({ operationalStatus: undefined, delayPercentage: 5 })]).records[0].operationalStatus).toBe("normal");
    expect(norm([rec({ operationalStatus: undefined })]).records).toEqual([]);
  });

  it.each([
    ["lower-case IATA code", { airportCode: "ruh" }],
    ["four-letter code", { airportCode: "OERK" }],
    ["bad country code", { countryCode: "SAU" }],
    ["missing Arabic name", { airportNameAr: undefined }],
    ["http source", { source: { ...TRACKER, url: "http://example.org/x" } }],
    ["javascript source", { source: { ...TRACKER, url: "javascript:alert(1)" } }],
    ["source with credentials", { source: { ...TRACKER, url: "https://user:pw@example.org/" } }],
    ["unknown source type", { source: { ...TRACKER, type: "rumour" } }],
    ["future observation", { observedAt: ago(-30), fetchedAt: ago(-30) }],
    ["unparseable time", { observedAt: "yesterday" }],
    ["fetched before observed", { observedAt: ago(10), fetchedAt: ago(60) }],
    ["expiry before observation", { expiresAt: ago(30) }],
    ["sample record outside development", { sample: true }],
  ])("rejects a record with %s", (_label, over) => {
    const { records, issues } = norm([rec(over)]);
    expect(records).toEqual([]);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("drops out-of-range figures but keeps the record", () => {
    const { records, issues } = norm([rec({ delayPercentage: 140, averageDelayMinutes: -3, cancelledFlights: 2.5 })]);
    expect(records[0].delayPercentage).toBeUndefined();
    expect(records[0].averageDelayMinutes).toBeUndefined();
    expect(records[0].cancelledFlights).toBeUndefined();
    expect(issues).toHaveLength(3);
  });

  it("strips bidi control characters from text", () => {
    const { records } = norm([rec({ statusMessageAr: "تأخير‮ RUH⁦ 40%" })]);
    expect(records[0].statusMessageAr).toBe("تأخير RUH 40%");
  });

  it("rejects a malformed feed and reports no update for an empty one", () => {
    expect(normalizeFeed("nope", { now: NOW, allowSamples: false }).issues[0]).toMatch(/records array/);
    expect(norm([]).lastFetchedAt).toBeNull();
    expect(norm([rec({ fetchedAt: ago(10) }), rec({ airportCode: "JED", fetchedAt: ago(5), observedAt: ago(6) })]).lastFetchedAt).toBe(ago(5));
  });
});

describe("suspension rule", () => {
  it("never derives a suspension from figures", () => {
    expect(statusFromMetrics({ delayPercentage: 100, cancellationPercentage: 100, averageDelayMinutes: 1440 })).toBe("major_disruption");
    expect(statusFromMetrics({})).toBe("unavailable");
    expect(norm([rec({ operationalStatus: undefined, cancellationPercentage: 100 })]).records[0].operationalStatus).toBe(
      "major_disruption"
    );
  });

  it.each([
    ["no evidence", undefined],
    ["flight-tracker evidence", TRACKER],
    ["manual-review evidence", { ...GACA_NOTICE, type: "manual_review" }],
    ["an unapproved host", { name: "Blog", url: "https://aviation-news.example.org/x", type: "official_airport" }],
  ])('does not show "suspended" with %s', (_label, evidence) => {
    const { records, conflicts } = norm([rec({ operationalStatus: "suspended", suspensionEvidence: evidence })]);
    expect(records).toEqual([]);
    expect(conflicts[0]).toMatchObject({ airportCode: "RUH", claims: [{ status: "suspended", verified: false }] });
    const v = view([rec({ operationalStatus: "suspended", suspensionEvidence: evidence })]);
    expect(v.saudi[0].status).toBe("unavailable");
    expect(v.saudi[0].conflictNote).toMatch(/لم يُؤكَّد من مصدر رسمي/);
  });

  it("accepts a suspension evidenced by a government or approved authority host", () => {
    for (const url of ["https://www.gaca.gov.sa/notice/1", "https://www.faa.gov/x", "https://www.kkia.sa/news/1"]) {
      const { records } = norm([rec({ operationalStatus: "suspended", source: GACA_NOTICE, suspensionEvidence: { ...GACA_NOTICE, url } })]);
      expect(records[0].operationalStatus).toBe("suspended");
      expect(records[0].suspensionEvidence?.url).toBe(url);
    }
  });

  it("voids an older verified record behind a newer unverified suspension claim", () => {
    const { records, conflicts } = norm([
      rec({ observedAt: ago(60), fetchedAt: ago(58) }),
      rec({ operationalStatus: "suspended", observedAt: ago(10), fetchedAt: ago(9), source: { ...TRACKER, name: "Tracker B" } }),
    ]);
    expect(records).toEqual([]);
    expect(conflicts[0].claims).toEqual([
      { status: "suspended", sourceName: "Tracker B", verified: false },
      { status: "normal", sourceName: "Flightradar24", verified: true },
    ]);
  });

  it("keeps a newer verified record over an older unverified claim", () => {
    const { records } = norm([rec({ observedAt: ago(10) }), rec({ operationalStatus: "suspended", observedAt: ago(60), fetchedAt: ago(59) })]);
    expect(records[0].operationalStatus).toBe("normal");
  });
});

describe("conflicting sources", () => {
  it("shows the more cautious status and records the conflict", () => {
    const { records, conflicts } = norm([
      rec({ operationalStatus: "normal", observedAt: ago(10), fetchedAt: ago(9) }),
      rec({ operationalStatus: "major_disruption", observedAt: ago(40), fetchedAt: ago(39), source: { ...TRACKER, name: "B" } }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].operationalStatus).toBe("major_disruption");
    expect(conflicts[0].noteAr).toMatch(/الأكثر حذرًا/);
    expect(conflicts[0].claims.map((c) => c.status).sort()).toEqual(["major_disruption", "normal"]);
  });

  it("ignores a disagreeing record outside the comparison window", () => {
    const { records, conflicts } = norm([
      rec({ observedAt: ago(10), fetchedAt: ago(9) }),
      rec({ operationalStatus: "major_disruption", observedAt: ago(150), fetchedAt: ago(149) }),
    ]);
    expect(records[0].operationalStatus).toBe("normal");
    expect(conflicts).toEqual([]);
  });
});

describe("review regressions", () => {
  const KKIA = { name: "KKIA", url: "https://www.kkia.sa/news/1", type: "official_airport" };

  it("lets a source's newer record supersede its own older one (reopening after a suspension)", () => {
    const { records, conflicts } = norm([
      rec({ operationalStatus: "suspended", source: KKIA, suspensionEvidence: KKIA, observedAt: ago(60), fetchedAt: ago(59) }),
      rec({ operationalStatus: "normal", source: KKIA, observedAt: ago(5), fetchedAt: ago(4) }),
    ]);
    expect(records[0].operationalStatus).toBe("normal");
    expect(conflicts).toEqual([]);
  });

  it("keeps a verified major disruption, with a note, behind a newer unverified suspension claim", () => {
    const v = view([
      rec({ airportCode: "JED", cityAr: "جدة", operationalStatus: "major_disruption", source: GACA_NOTICE, observedAt: ago(20), fetchedAt: ago(19) }),
      rec({ airportCode: "JED", cityAr: "جدة", operationalStatus: "suspended", observedAt: ago(15), fetchedAt: ago(14) }),
      rec(),
    ]);
    expect(v.saudi[1]).toMatchObject({ status: "major_disruption" });
    expect(v.saudi[1].conflictNote).toMatch(/لم يُؤكَّد/);
    expect(v.saudiOverall).toBe("major_disruption");
    expect(v.saudiMostAffected).toBe("جدة (JED)");
  });

  it("ignores an expired unverified suspension claim", () => {
    const { records, conflicts } = norm([rec(), rec({ operationalStatus: "suspended", observedAt: ago(5), fetchedAt: ago(4), expiresAt: ago(1) })]);
    expect(records[0].operationalStatus).toBe("normal");
    expect(conflicts).toEqual([]);
  });

  it("counts a non-configured Saudi airport in the Saudi summary but not in coverage", () => {
    const v = view([
      rec(),
      rec({ airportCode: "AHB", cityAr: "أبها", operationalStatus: "suspended", source: GACA_NOTICE, suspensionEvidence: GACA_NOTICE }),
    ]);
    expect(v.saudiOverall).toBe("suspended");
    expect(v.saudiMostAffected).toBe("أبها (AHB)");
    expect(v.saudiCoverage).toEqual({ verified: 1, total: 4 });
  });

  it('drops "live" once the newest data is older than ten minutes', () => {
    expect(view([rec({ fetchedAt: ago(9), observedAt: ago(10) })], { live: true }).live).toBe(true);
    expect(view([rec({ fetchedAt: ago(30), observedAt: ago(31) })], { live: true }).live).toBe(false);
  });

  it("caps expiresAt at 24 hours after observation", () => {
    const { records } = norm([rec({ observedAt: ago(60), fetchedAt: ago(59), expiresAt: "2099-01-01T00:00:00Z" })]);
    expect(records[0].expiresAt).toBe(new Date(Date.parse(ago(60)) + 24 * 3600_000).toISOString());
    const old = view([rec({ observedAt: ago(30 * 24 * 60), fetchedAt: ago(30 * 24 * 60 - 1), expiresAt: "2099-01-01T00:00:00Z" })]);
    expect(old.saudi[0].isStale).toBe(true);
  });

  it("rejects timestamps without an explicit zone and accepts explicit offsets", () => {
    expect(norm([rec({ observedAt: "2026-10-16T11:30:00", fetchedAt: "2026-10-16T11:35:00" })]).records).toEqual([]);
    const { records } = norm([rec({ observedAt: "2026-10-16T11:30:00+03:00", fetchedAt: "2026-10-16T11:35:00+03:00" })]);
    expect(records[0].observedAt).toBe("2026-10-16T08:30:00.000Z");
  });

  it("does not let a stale or low-confidence record decide a conflict", () => {
    const { records, conflicts } = norm([
      rec({ operationalStatus: "normal", source: GACA_NOTICE, observedAt: ago(10), fetchedAt: ago(9) }),
      rec({ operationalStatus: "major_disruption", confidence: "low", observedAt: ago(30), fetchedAt: ago(29) }),
    ]);
    expect(records[0].operationalStatus).toBe("normal");
    expect(conflicts).toEqual([]);
  });
});

describe("view", () => {
  const four = (status: string, over: Record<string, unknown> = {}) =>
    SAUDI_AIRPORTS.map((a) => rec({ airportCode: a.airportCode, airportNameAr: a.airportNameAr, cityAr: a.cityAr, operationalStatus: status, ...over }));

  it("shows every configured Saudi airport as unavailable with an official link when there is no data", () => {
    const v = view([], { mode: "unavailable" });
    expect(v.saudi.map((r) => r.airportCode)).toEqual(["RUH", "JED", "DMM", "MED"]);
    expect(v.saudi.every((r) => r.status === "unavailable" && r.officialLink?.url.startsWith("https://"))).toBe(true);
    expect(v).toMatchObject({ saudiOverall: "unavailable", hasCurrentData: false, globalUnavailable: true, lastUpdate: undefined });
    expect(v.saudiCoverage).toEqual({ verified: 0, total: 4 });
  });

  it("reports all-normal with full coverage", () => {
    const v = view(four("normal"));
    expect(v).toMatchObject({ saudiOverall: "normal", saudiMostAffected: undefined, saudiCoverage: { verified: 4, total: 4 } });
    expect(v.lastUpdate).toBe(formatRiyadh(ago(10)));
  });

  it("names the one severely disrupted Saudi airport", () => {
    const records = four("normal");
    records[1] = { ...records[1], operationalStatus: "major_disruption", delayPercentage: 55 };
    const v = view(records);
    expect(v.saudiOverall).toBe("major_disruption");
    expect(v.saudiMostAffected).toBe("جدة (JED)");
    expect(v.saudi[1].action).toMatch(/شركة الطيران/);
    expect(v.saudi[1].metrics[0]).toEqual({ label: "الرحلات المتأخرة", value: "55%" });
  });

  it("does not let a global disruption change the Saudi summary", () => {
    const v = view([rec(), rec({ airportCode: "LHR", countryCode: "GB", operationalStatus: "major_disruption" })]);
    expect(v.saudiOverall).toBe("normal");
    expect(v.global.map((r) => r.airportCode)).toEqual(["LHR"]);
    expect(v.saudiCoverage).toEqual({ verified: 1, total: 4 });
  });

  it("labels stale records and keeps them out of the summary and ranking", () => {
    const v = view([
      rec({ operationalStatus: "major_disruption", observedAt: ago(300), fetchedAt: ago(299) }),
      rec({ airportCode: "LHR", countryCode: "GB", operationalStatus: "suspended", observedAt: ago(300), fetchedAt: ago(299) }),
    ]);
    expect(v.saudi[0]).toMatchObject({ status: "unavailable", isStale: true, lastKnown: { label: "اضطراب مرتفع" } });
    expect(v.saudiOverall).toBe("unavailable");
    expect(v.global).toEqual([]);
    expect(v.hasCurrentData).toBe(false);
  });

  it("keeps low-confidence records out of the summary and ranking", () => {
    const v = view([
      rec({ operationalStatus: "major_disruption", confidence: "low" }),
      rec({ airportCode: "LHR", countryCode: "GB", operationalStatus: "major_disruption", confidence: "low" }),
    ]);
    expect(v.saudi[0]).toMatchObject({ status: "major_disruption", lowConfidence: true });
    expect(v.saudiOverall).toBe("unavailable");
    expect(v.global).toEqual([]);
  });

  it("ranks at most five global disruptions by severity, then recency", () => {
    const g = (code: string, status: string, minutes: number) =>
      rec({ airportCode: code, countryCode: "GB", operationalStatus: status, observedAt: ago(minutes), fetchedAt: ago(minutes - 1) });
    const v = view([
      g("AAA", "minor_delays", 10),
      g("BBB", "major_disruption", 30),
      g("CCC", "major_disruption", 5),
      g("DDD", "minor_delays", 20),
      g("EEE", "minor_delays", 40),
      g("FFF", "minor_delays", 60),
      g("GGG", "normal", 2),
    ]);
    expect(v.global.map((r) => r.airportCode)).toEqual(["CCC", "BBB", "AAA", "DDD", "EEE"]);
  });

  it("lists a disrupted Saudi airport that is not configured", () => {
    const v = view([rec({ airportCode: "AHB", cityAr: "أبها", operationalStatus: "minor_delays" })]);
    expect(v.global.map((r) => r.airportCode)).toEqual(["AHB"]);
    expect(v.saudiCoverage.verified).toBe(0);
  });

  it("distinguishes no global data from no global disruptions", () => {
    expect(view([rec()]).globalUnavailable).toBe(true);
    const calm = view([rec({ airportCode: "LHR", countryCode: "GB" })]);
    expect(calm.globalUnavailable).toBe(false);
    expect(calm.global).toEqual([]);
  });

  it("flags fixture data as a sample", () => {
    const feed = normalizeFeed(sampleFeed(NOW), { now: NOW, allowSamples: true });
    const v = buildAirportView({ ...snapshot([]), mode: "fixture", records: feed.records, conflicts: feed.conflicts }, NOW);
    expect(v.isSample).toBe(true);
    expect(v.global.find((r) => r.airportCode === "AMS")?.conflictNote).toMatch(/الأكثر حذرًا/);
    expect(v.global[0]).toMatchObject({ airportCode: "KTM", status: "suspended" });
  });
});

describe("providers and service", () => {
  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  const FEED = "https://cms.example.org/airport-status.json";
  const remoteEnv = { NODE_ENV: "production", AIRPORT_STATUS_FEED_URL: FEED };
  const good = { records: [rec({ observedAt: ago(5), fetchedAt: ago(4) })] };

  beforeEach(() => resetAirportStatusCache());
  afterEach(() => vi.restoreAllMocks());

  it("serves fixtures in development only", async () => {
    const dev = await getAirportStatusSnapshot({ now: NOW, env: { NODE_ENV: "development", AIRPORT_STATUS_FIXTURES: "1" } });
    expect(dev.mode).toBe("fixture");
    expect(dev.records.every((r) => r.sample)).toBe(true);
    const prod = await getAirportStatusSnapshot({ now: NOW, env: { NODE_ENV: "production", AIRPORT_STATUS_FIXTURES: "1" } });
    expect(prod.mode).toBe("unavailable");
    expect(prod.records).toEqual([]);
    expect(prod.issues).toContain("fixtures: refused in production");
  });

  it("rejects sample records placed in the production manual feed", async () => {
    const s = await getAirportStatusSnapshot({ now: NOW, env: { NODE_ENV: "production" }, manual: sampleFeed(NOW) });
    expect(s.records).toEqual([]);
    expect(s.mode).toBe("unavailable");
  });

  it("is unavailable when no provider is configured", async () => {
    const s = await getAirportStatusSnapshot({ now: NOW, env: { NODE_ENV: "production" }, manual: { records: [] } });
    expect(s).toMatchObject({ mode: "unavailable", live: false, records: [], lastSuccessfulUpdate: null });
  });

  it("serves a valid manual feed, never as live", async () => {
    const s = await getAirportStatusSnapshot({ now: NOW, env: { NODE_ENV: "production" }, manual: good });
    expect(s).toMatchObject({ mode: "manual_feed", live: false, lastSuccessfulUpdate: ago(4) });
  });

  it("calls the remote feed server-side with token, timeout, no redirects and a 5-minute cache", async () => {
    const fetchImpl = vi.fn(async (_url: string, _init: RequestInit & { next?: { revalidate: number } }) => ok(good));
    const s = await getAirportStatusSnapshot({
      now: NOW,
      env: { ...remoteEnv, AIRPORT_STATUS_FEED_TOKEN: "secret" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(s).toMatchObject({ mode: "cms_feed", live: false, refreshFailed: false });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(FEED);
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
    expect(init.next?.revalidate).toBe(FEED_REVALIDATE_SECONDS);
  });

  it('is "live" only for an authorized API with the live flag', async () => {
    const run = (env: Record<string, string>) =>
      getAirportStatusSnapshot({ now: NOW, env: { ...remoteEnv, ...env }, fetchImpl: (async () => ok(good)) as unknown as typeof fetch });
    expect((await run({ AIRPORT_STATUS_FEED_KIND: "authorized_api", AIRPORT_STATUS_FEED_LIVE: "1" })).live).toBe(true);
    resetAirportStatusCache();
    expect((await run({ AIRPORT_STATUS_FEED_KIND: "authorized_api" })).live).toBe(false);
    resetAirportStatusCache();
    expect((await run({ AIRPORT_STATUS_FEED_LIVE: "1" })).live).toBe(false);
  });

  it("does not retry a timeout, then falls back to the manual feed", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const s = await getAirportStatusSnapshot({ now: NOW, env: remoteEnv, fetchImpl: fetchImpl as unknown as typeof fetch, manual: { records: [] } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(s).toMatchObject({ mode: "unavailable", refreshFailed: true, records: [] });
    expect(s.issues.join(" ")).toMatch(/refresh failed \(timeout\)/);
  });

  it("retries a network error or 5xx a bounded number of times", async () => {
    const net = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await getAirportStatusSnapshot({ now: NOW, env: remoteEnv, fetchImpl: net as unknown as typeof fetch, manual: { records: [] } });
    expect(net).toHaveBeenCalledTimes(1 + FEED_RETRIES);
    const flaky = vi.fn().mockResolvedValueOnce(new Response("down", { status: 503 })).mockResolvedValueOnce(ok(good));
    resetAirportStatusCache();
    const s = await getAirportStatusSnapshot({ now: NOW, env: remoteEnv, fetchImpl: flaky as unknown as typeof fetch });
    expect(flaky).toHaveBeenCalledTimes(2);
    expect(s.refreshFailed).toBe(false);
  });

  it("does not retry a 4xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 403 }));
    await getAirportStatusSnapshot({ now: NOW, env: remoteEnv, fetchImpl: fetchImpl as unknown as typeof fetch, manual: { records: [] } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["invalid JSON", () => new Response("<html>", { status: 200 })],
    ["an oversized body", () => new Response(JSON.stringify({ records: [], pad: "ج".repeat(300_000) }), { status: 200 })],
    ["an empty feed", () => ok({ records: [] })],
    ["a wholly invalid feed", () => ok({ records: [{ airportCode: "x" }] })],
  ])("keeps the last good data, marked not live, after %s", async (_label, bad) => {
    const env = { ...remoteEnv, AIRPORT_STATUS_FEED_KIND: "authorized_api", AIRPORT_STATUS_FEED_LIVE: "1" };
    const first = await getAirportStatusSnapshot({ now: NOW, env, fetchImpl: (async () => ok(good)) as unknown as typeof fetch });
    expect(first.live).toBe(true);
    const second = await getAirportStatusSnapshot({ now: NOW, env, fetchImpl: (async () => bad()) as unknown as typeof fetch });
    expect(second).toMatchObject({ refreshFailed: true, live: false, lastSuccessfulUpdate: ago(4) });
    expect(second.records).toHaveLength(1);
  });

  it("ignores a non-https feed URL", () => {
    const choice = selectProvider({ NODE_ENV: "production", AIRPORT_STATUS_FEED_URL: "http://cms.example.org/feed.json" });
    expect(choice.provider.mode).toBe("manual_feed");
    expect(choice.issues[0]).toMatch(/https/);
  });
});
