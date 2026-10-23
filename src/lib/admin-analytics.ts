import type { Locale } from "@/lib/i18n/config";
import type { SavedAnalysis } from "@/lib/storage";

/**
 * Admin analytics data layer.
 *
 * Aggregates a deterministic, seeded baseline with the viewer's real saved
 * analyses (from local storage) so the dashboard reflects actual usage on top
 * of a realistic platform baseline. In production these functions would query
 * a warehouse / analytics API; the return shape is the drop-in contract.
 */

export interface RankItem {
  name: string;
  count: number;
}

export interface AdminData {
  users: number;
  usersDelta: number;
  searches: number;
  searchesDelta: number;
  visitorsToday: number;
  visitorsDelta: number;
  conversion: number;
  conversionDelta: number;
  visitorSeries: { label: string; value: number }[];
  topHotels: RankItem[];
  topDestinations: RankItem[];
  topOffers: RankItem[];
  searchesByTool: { key: string; value: number }[];
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

type Bi = { ar: string; en: string };

const BASE_HOTELS: Bi[] = [
  { ar: "فندق مرمرة بالاس", en: "Marmara Palace Hotel" },
  { ar: "منتجع الواحة الذهبية", en: "Golden Oasis Resort" },
  { ar: "فندق سنترال بارك", en: "Central Park Hotel" },
  { ar: "منتجع بحيرة الزمرد", en: "Emerald Lake Resort" },
  { ar: "بوتيك الحي القديم", en: "Old Town Boutique" },
  { ar: "أجنحة سكاي لاين", en: "Skyline Suites" },
];

const BASE_DESTINATIONS: Bi[] = [
  { ar: "إسطنبول، تركيا", en: "Istanbul, Turkey" },
  { ar: "دبي، الإمارات", en: "Dubai, UAE" },
  { ar: "العلا، السعودية", en: "AlUla, Saudi Arabia" },
  { ar: "كوالالمبور، ماليزيا", en: "Kuala Lumpur, Malaysia" },
  { ar: "تبليسي، جورجيا", en: "Tbilisi, Georgia" },
  { ar: "القاهرة، مصر", en: "Cairo, Egypt" },
];

const BASE_OFFERS: Bi[] = [
  { ar: "باقة إسطنبول ٥ ليالٍ", en: "Istanbul 5-night package" },
  { ar: "عرض دبي شامل الطيران", en: "Dubai flight-inclusive deal" },
  { ar: "رحلة العلا الشتوية", en: "AlUla winter trip" },
  { ar: "باقة ماليزيا العائلية", en: "Malaysia family package" },
  { ar: "عرض جورجيا الاقتصادي", en: "Georgia budget offer" },
];

const TOOLS = ["hotel", "destination", "offer", "compare", "knowledge"] as const;

function localize(items: Bi[], locale: Locale) {
  return items.map((i) => (locale === "ar" ? i.ar : i.en));
}

function rankFrom(
  base: Bi[],
  locale: Locale,
  rng: () => number,
  scale: number,
  realTitles: string[]
): RankItem[] {
  const names = localize(base, locale);
  const counts = new Map<string, number>();
  names.forEach((n, i) => counts.set(n, Math.round((scale * (base.length - i)) / base.length + rng() * scale * 0.3)));
  // Fold in the viewer's real analyses so their activity bubbles up.
  realTitles.forEach((title) => {
    const key = title.trim();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 3 + Math.floor(rng() * 4));
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function buildAdminData(
  locale: Locale,
  saved: SavedAnalysis[],
  now: Date
): AdminData {
  // Stable daily seed so the dashboard doesn't jitter within a day.
  const daySeed = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const rng = makeRng(hash(`admin:${daySeed}`));

  const realCount = saved.length;

  const users = 8200 + Math.floor(rng() * 1800) + realCount * 2;
  const searchesTotal = 24000 + Math.floor(rng() * 6000) + realCount;
  const visitorsToday = 1400 + Math.floor(rng() * 900);
  const conversion = Math.round((3.4 + rng() * 2.4) * 10) / 10;

  // 14-day visitor series with a gentle weekly rhythm + upward trend.
  const visitorSeries: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const weekend = d.getDay() === 5 || d.getDay() === 6 ? 1.18 : 1;
    const trend = 1 + (13 - i) * 0.012;
    const value = Math.round((900 + rng() * 700) * weekend * trend);
    visitorSeries.push({
      label: new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
        day: "numeric",
        month: "short",
      }).format(d),
      value,
    });
  }

  const hotelTitles = saved.filter((s) => s.type === "hotel").map((s) => s.title);
  const destTitles = saved.filter((s) => s.type === "destination").map((s) => s.title);
  const offerTitles = saved.filter((s) => s.type === "offer").map((s) => s.title);

  // Searches split across tools, biased toward the analyzers.
  const weights = [0.34, 0.24, 0.18, 0.12, 0.12];
  const searchesByTool = TOOLS.map((key, i) => ({
    key,
    value:
      Math.round(searchesTotal * weights[i] * (0.9 + rng() * 0.2)) +
      saved.filter((s) => s.type === key).length,
  }));

  return {
    users,
    usersDelta: Math.round((rng() * 14 + 4) * 10) / 10,
    searches: searchesByTool.reduce((s, t) => s + t.value, 0),
    searchesDelta: Math.round((rng() * 18 + 6) * 10) / 10,
    visitorsToday,
    visitorsDelta: Math.round((rng() * 20 - 4) * 10) / 10,
    conversion,
    conversionDelta: Math.round((rng() * 3 - 0.8) * 10) / 10,
    visitorSeries,
    topHotels: rankFrom(BASE_HOTELS, locale, rng, 520, hotelTitles),
    topDestinations: rankFrom(BASE_DESTINATIONS, locale, rng, 480, destTitles),
    topOffers: rankFrom(BASE_OFFERS, locale, rng, 360, offerTitles),
    searchesByTool,
  };
}

/** Build a CSV report string from the dashboard data. */
export function toCsv(data: AdminData, labels: Record<string, string>): string {
  const rows: string[][] = [];
  rows.push([labels.metric, labels.value]);
  rows.push([labels.kUsers, String(data.users)]);
  rows.push([labels.kSearches, String(data.searches)]);
  rows.push([labels.kVisitors, String(data.visitorsToday)]);
  rows.push([labels.kConversion, `${data.conversion}%`]);
  rows.push([]);
  rows.push([labels.topHotels, labels.count]);
  data.topHotels.forEach((h) => rows.push([h.name, String(h.count)]));
  rows.push([]);
  rows.push([labels.topDestinations, labels.count]);
  data.topDestinations.forEach((h) => rows.push([h.name, String(h.count)]));
  rows.push([]);
  rows.push([labels.topOffers, labels.count]);
  data.topOffers.forEach((h) => rows.push([h.name, String(h.count)]));
  rows.push([]);
  rows.push([labels.visitorsTitle, labels.count]);
  data.visitorSeries.forEach((v) => rows.push([v.label, String(v.value)]));

  return rows
    .map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
