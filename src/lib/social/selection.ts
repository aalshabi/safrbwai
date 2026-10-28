import type { SocialHighlight } from "@/lib/social-highlights";

/** How long a ranked selection stays current before the platform is asked again. */
export const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * What a strip shows and where it came from. `manual` is a hand-picked list
 * of verified post URLs; `ranked` is the weekly selection from the platform's
 * own metrics, with the size of the pool it was ranked from and when that
 * ranking last succeeded.
 */
export type SocialStrip = {
  items: SocialHighlight[];
  source: "manual" | "ranked";
  poolSize?: number;
  refreshedAt?: string;
};

export type Curation = Readonly<{ pinned: readonly string[]; excluded: readonly string[] }>;

export const NO_CURATION: Curation = { pinned: [], excluded: [] };

/**
 * Pinned ids first (in their listed order, when present in the pool), then the
 * rest by metric, highest first. Excluded ids never appear. Items without the
 * metric sort last; they are never given an estimated value.
 */
export function rankWithCuration<T extends { id: string; metric: number | null }>(
  pool: readonly T[],
  curation: Curation,
  max: number
): T[] {
  const excluded = new Set(curation.excluded);
  const allowed = pool.filter((item) => !excluded.has(item.id));
  const pinned = curation.pinned
    .map((id) => allowed.find((item) => item.id === id))
    .filter((item): item is T => Boolean(item));
  const pinnedIds = new Set(pinned.map((item) => item.id));
  const rest = allowed
    .filter((item) => !pinnedIds.has(item.id))
    .sort((a, b) => (b.metric ?? -1) - (a.metric ?? -1));
  return [...pinned, ...rest].slice(0, max);
}

/** A saved weekly ranking: the selected entries, when it ran and how many posts it looked at. */
export type RankedSnapshot<T> = { version: 2; refreshedAt: string; poolSize: number; entries: T[] };

export function parseSnapshot<T>(raw: string | null, isEntry: (value: unknown) => value is T): RankedSnapshot<T> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RankedSnapshot<unknown>>;
    if (value?.version !== 2 || typeof value.refreshedAt !== "string" || !Array.isArray(value.entries)) return null;
    if (Number.isNaN(Date.parse(value.refreshedAt))) return null;
    return {
      version: 2,
      refreshedAt: value.refreshedAt,
      poolSize: typeof value.poolSize === "number" ? value.poolSize : value.entries.length,
      entries: value.entries.filter(isEntry),
    };
  } catch {
    return null;
  }
}

export function isFresh(snapshot: RankedSnapshot<unknown> | null, now: number): boolean {
  return Boolean(snapshot) && now - Date.parse(snapshot!.refreshedAt) < WEEKLY_REFRESH_MS;
}

const TITLE_LIMIT = 70;

/** The first non-empty line of a post's own text, shortened for a card title. */
export function shortTitle(text: string): string {
  const line = text.split("\n").map((part) => part.trim()).find(Boolean) ?? "";
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT - 1).trimEnd()}…` : line;
}
