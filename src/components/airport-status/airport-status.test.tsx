import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { sampleFeed } from "@/lib/airport-status/fixtures";
import { normalizeFeed } from "@/lib/airport-status/normalize";
import { formatRiyadh } from "@/lib/airport-status/status";
import type { AirportStatusSnapshot } from "@/lib/airport-status/types";
import { buildAirportView } from "@/lib/airport-status/view";
import {
  AirportStatusBanner,
  AirportStatusCard,
  AirportStatusSidebar,
  NOTICE,
  TITLE,
  LINKS_TITLE,
  NO_LIVE_STATUS,
  UNAVAILABLE_MESSAGE,
  saudiSummary,
  updateLine,
} from "./airport-status";

const NOW = new Date("2026-10-16T09:00:00Z");
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString();

function viewOf(input: unknown, over: Partial<AirportStatusSnapshot> = {}, allowSamples = false) {
  const feed = normalizeFeed(input, { now: NOW, allowSamples });
  const snapshot: AirportStatusSnapshot = {
    mode: feed.records.length ? "manual_feed" : "unavailable",
    live: false,
    records: feed.records,
    conflicts: feed.conflicts,
    lastSuccessfulUpdate: feed.lastFetchedAt,
    refreshFailed: false,
    issues: [],
    ...over,
  };
  return buildAirportView(snapshot, NOW);
}
const fixtureView = () => viewOf(sampleFeed(NOW), { mode: "fixture" }, true);
const emptyView = (over: Partial<AirportStatusSnapshot> = {}) => viewOf({ records: [] }, over);

const SRC = { name: "KKIA", url: "https://www.kkia.sa/en/flights/departures-and-arrivals", type: "official_airport" };
const jedSevere = {
  records: [
    { airportCode: "RUH", airportNameAr: "مطار الملك خالد الدولي", cityAr: "الرياض", countryCode: "SA", operationalStatus: "normal", source: SRC, observedAt: ago(10), fetchedAt: ago(9) },
    {
      airportCode: "JED",
      airportNameAr: "مطار الملك عبدالعزيز الدولي",
      cityAr: "جدة",
      countryCode: "SA",
      operationalStatus: "major_disruption",
      delayPercentage: 48,
      averageDelayMinutes: 75,
      source: SRC,
      observedAt: ago(8),
      fetchedAt: ago(7),
    },
  ],
};

afterEach(cleanup);

describe("collapsed summary text", () => {
  it("summarises verified Saudi records with the most affected airport and partial coverage", () => {
    const v = viewOf(jedSevere);
    expect(saudiSummary(v)).toBe("المطارات السعودية: اضطراب مرتفع — الأشد تأثرًا: جدة (JED) · تغطية جزئية (2 من 4)");
    expect(updateLine(v)).toBe(`آخر تحديث: ${formatRiyadh(ago(7))} بتوقيت الرياض`);
  });

  it('says "مباشر" only when the snapshot is live', () => {
    expect(updateLine(viewOf(jedSevere, { live: true }))).toMatch(/^مباشر · آخر تحديث: /);
    expect(updateLine(viewOf(jedSevere))).not.toMatch(/مباشر/);
    expect(updateLine(emptyView())).toBe("لا يوجد تحديث موثق بعد");
  });

  it("reports unavailable when no Saudi record is verified", () => {
    expect(saudiSummary(emptyView())).toBe("المطارات السعودية: البيانات غير متاحة");
  });
});

describe("sidebar (desktop)", () => {
  it("renders RTL Arabic with title, sections, the exact notice and a safe map link", () => {
    const { container } = render(<AirportStatusSidebar view={fixtureView()} />);
    const aside = container.querySelector("aside")!;
    expect(aside.getAttribute("dir")).toBe("rtl");
    expect(aside.getAttribute("lang")).toBe("ar");
    expect(screen.getByRole("complementary", { name: TITLE })).toBeTruthy();
    for (const h of ["المطارات السعودية", "أبرز الاضطرابات عالميًا", "تنبيه المسافر"]) {
      expect(screen.getByRole("heading", { level: 3, name: h })).toBeTruthy();
    }
    expect(screen.getByText(NOTICE)).toBeTruthy();
    const map = screen.getByRole("link", { name: /عرض خريطة الاضطرابات العالمية/ });
    expect(map.getAttribute("href")).toBe("https://www.flightradar24.com/data/airport-disruption");
  });

  it("opens every link safely in a new tab with an accessible hint", () => {
    const { container } = render(<AirportStatusSidebar view={fixtureView()} />);
    const links = [...container.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(5);
    for (const a of links) {
      expect(a.getAttribute("href")).toMatch(/^https:\/\//);
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toBe("noopener noreferrer");
      expect(a.textContent).toMatch(/يفتح في نافذة جديدة/);
    }
  });

  it("labels fixture data, stale data and conflicts", () => {
    const { container } = render(<AirportStatusSidebar view={fixtureView()} />);
    expect(screen.getByText("بيانات تجريبية للتطوير — ليست حالة حقيقية")).toBeTruthy();
    const dmm = container.querySelector('[data-iata="DMM"]')!;
    expect(dmm.getAttribute("data-stale")).toBe("true");
    expect(within(dmm as HTMLElement).getByText(/بيانات قديمة — آخر حالة معروفة: يعمل بشكل طبيعي/)).toBeTruthy();
    expect(container.querySelector('[data-iata="AMS"] [data-conflict]')?.textContent).toMatch(/الأكثر حذرًا/);
  });

  it("shows status with icon and text, and isolates IATA codes and figures left-to-right", () => {
    const { container } = render(<AirportStatusSidebar view={viewOf(jedSevere)} />);
    const jed = container.querySelector('[data-iata="JED"]') as HTMLElement;
    const badge = jed.querySelector("[data-status]")!;
    expect(badge.getAttribute("data-status")).toBe("major_disruption");
    expect(badge.textContent).toBe("اضطراب مرتفع");
    expect(badge.querySelector("svg[aria-hidden]")).toBeTruthy();
    const isolated = [...jed.querySelectorAll('bdi[dir="ltr"]')].map((b) => b.textContent);
    expect(isolated).toEqual(expect.arrayContaining(["JED", "48%", "75"]));
    expect(within(jed).getByText(/شركة الطيران/)).toBeTruthy();
  });

  it("shows a useful unavailable state with official links", () => {
    render(<AirportStatusSidebar view={emptyView({ refreshFailed: true })} />);
    const status = screen.getByRole("status");
    expect(within(status).getByText(UNAVAILABLE_MESSAGE)).toBeTruthy();
    expect(within(status).getByText(/تحقق من الروابط الرسمية/)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /الموقع الرسمي/ })).toHaveLength(4);
    expect(screen.getByText("بيانات الاضطرابات العالمية غير متاحة حاليًا.")).toBeTruthy();
  });

  it("is titled as official links, not a live status, when no record is current", () => {
    render(<AirportStatusSidebar view={emptyView()} />);
    expect(screen.getByRole("complementary", { name: LINKS_TITLE })).toBeTruthy();
    expect(screen.queryByText(TITLE)).toBeNull();
    expect(within(screen.getByRole("status")).getByText(NO_LIVE_STATUS)).toBeTruthy();
  });

  it("keeps last successful data labelled when a refresh failed", () => {
    render(<AirportStatusSidebar view={viewOf(jedSevere, { refreshFailed: true })} />);
    expect(screen.getByText(/تعذر التحديث الأخير؛ تُعرض آخر بيانات ناجحة/)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("never says مباشر for non-live data", () => {
    const { container } = render(<AirportStatusSidebar view={fixtureView()} />);
    expect(container.textContent).not.toMatch(/مباشر/);
  });
});

describe("card (tablet)", () => {
  it("is a labelled region holding the Saudi and global sections", () => {
    render(<AirportStatusCard view={viewOf(jedSevere, { live: true })} />);
    const region = screen.getByRole("region", { name: TITLE });
    expect(region.getAttribute("dir")).toBe("rtl");
    expect(within(region).getByRole("heading", { name: "المطارات السعودية" })).toBeTruthy();
    expect(within(region).getByRole("heading", { name: "أبرز الاضطرابات عالميًا" })).toBeTruthy();
    expect(within(region).getByText(/^مباشر · آخر تحديث/)).toBeTruthy();
  });
});

describe("banner (mobile)", () => {
  it("shows the collapsed summary in an accessible native disclosure", () => {
    const { container } = render(<AirportStatusBanner view={viewOf(jedSevere)} />);
    expect(screen.getByRole("region", { name: TITLE })).toBeTruthy();
    const details = container.querySelector("details")!;
    const summary = details.querySelector(":scope > summary")!;
    expect(details.open).toBe(false);
    expect(summary.textContent).toContain("اضطراب مرتفع — الأشد تأثرًا: جدة (JED)");
    expect(summary.textContent).toContain(`آخر تحديث: ${formatRiyadh(ago(7))} بتوقيت الرياض`);
    expect(summary.textContent).toContain("عرض التفاصيل أو إخفاؤها");
    expect(summary.querySelector(":scope > svg")?.getAttribute("class")).toMatch(/motion-reduce:transition-none/);
  });

  it("expands to the full lists", () => {
    const { container } = render(<AirportStatusBanner view={fixtureView()} />);
    const details = container.querySelector("details")!;
    fireEvent.click(details.querySelector(":scope > summary")!);
    expect(details.open).toBe(true);
    expect(within(details).getByRole("heading", { name: "أبرز الاضطرابات عالميًا" })).toBeTruthy();
    expect(within(details).getByText(NOTICE)).toBeTruthy();
  });
});
