import { unstable_cache } from "next/cache";
import { MAX_HIGHLIGHTS, SOCIAL_CURATION, SOCIAL_HIGHLIGHTS, type SocialHighlight } from "@/lib/social-highlights";
import {
  isFresh,
  parseSnapshot,
  rankWithCuration,
  shortTitle,
  type Curation,
  type RankedSnapshot,
  type SocialStrip,
} from "@/lib/social/selection";
import { collectTikTokVideos, refreshTikTokTokens, type TikTokVideo } from "./api";
import { getTikTokConfig, getTikTokStoreConfig, type TikTokConfig } from "./config";
import { REFRESH_TOKEN_KEY, UpstashTikTokStore, VIDEOS_KEY, type TikTokStore } from "./store";

/** How many of the newest videos the weekly ranking looks at (three pages of 20). */
export const TIKTOK_RANK_POOL = 60;

export type LatestVideosDeps = {
  config: TikTokConfig | null;
  store: TikTokStore | null;
  fetchImpl?: typeof fetch;
  curation?: Curation;
  now?: number;
};

function defaultDeps(): LatestVideosDeps {
  const storeConfig = getTikTokStoreConfig();
  return { config: getTikTokConfig(), store: storeConfig ? new UpstashTikTokStore(storeConfig) : null };
}

/** The videos as homepage highlights; TikTok's own text is shown as written, in both languages. */
export function tiktokHighlights(videos: readonly TikTokVideo[]): SocialHighlight[] {
  return videos.slice(0, MAX_HIGHLIGHTS).map((video) => {
    const text = shortTitle(video.title || video.description);
    return {
      id: `tiktok-${video.id}`,
      platform: "tiktok",
      title: { ar: text || "فيديو من سافر بوعي", en: text || "A SafrBwai video" },
      description: { ar: "", en: "" },
      action: { ar: "شاهد على تيك توك", en: "Watch on TikTok" },
      href: `https://www.tiktok.com/@safrbwai/video/${video.id}`,
    };
  });
}

function isVideo(value: unknown): value is TikTokVideo {
  const video = value as Partial<TikTokVideo> | null;
  return Boolean(video) && /^\d+$/.test(String(video!.id));
}

export function parseStoredVideos(raw: string | null): RankedSnapshot<TikTokVideo> | null {
  return parseSnapshot(raw, isVideo);
}

/** The weekly selection: the most-viewed of the newest videos, after pins and exclusions. */
export function rankTikTokVideos(pool: readonly TikTokVideo[], curation: Curation): TikTokVideo[] {
  return rankWithCuration(
    pool.map((video) => ({ ...video, metric: video.viewCount })),
    curation,
    MAX_HIGHLIGHTS
  ).map(({ metric: _metric, ...video }) => video);
}

export function tiktokSnapshot(pool: readonly TikTokVideo[], curation: Curation, now: number): RankedSnapshot<TikTokVideo> {
  return { version: 2, refreshedAt: new Date(now).toISOString(), poolSize: pool.length, entries: rankTikTokVideos(pool, curation) };
}

/** Saves the connection and its first ranked selection. */
export async function saveTikTokConnection(
  store: TikTokStore,
  refreshToken: string,
  snapshot: RankedSnapshot<TikTokVideo>
) {
  await store.set(REFRESH_TOKEN_KEY, refreshToken);
  await store.set(VIDEOS_KEY, JSON.stringify(snapshot));
}

function rankedStrip(snapshot: RankedSnapshot<TikTokVideo>): SocialStrip {
  return {
    items: tiktokHighlights(snapshot.entries),
    source: "ranked",
    poolSize: snapshot.poolSize,
    refreshedAt: snapshot.refreshedAt,
  };
}

const manualStrip = (): SocialStrip => ({ items: [...SOCIAL_HIGHLIGHTS.tiktok], source: "manual" });

/**
 * The TikTok strip. With the account linked, it shows the most-viewed of the
 * newest videos, ranked at most once a week: a fresh saved ranking is reused
 * as is, and TikTok is only asked again once it is seven days old. Any failure
 * (TikTok, the store, an expired connection) keeps the last ranking that
 * worked, with its real date. Without a link it shows the hand-picked list.
 */
export async function getTikTokStrip(deps: LatestVideosDeps = defaultDeps()): Promise<SocialStrip> {
  const { config, store, fetchImpl = fetch, curation = SOCIAL_CURATION.tiktok, now = Date.now() } = deps;
  if (!config || !store) return manualStrip();

  let saved: RankedSnapshot<TikTokVideo> | null = null;
  try {
    saved = parseStoredVideos(await store.get(VIDEOS_KEY));
    if (saved && isFresh(saved, now)) return rankedStrip(saved);
    const refreshToken = await store.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) return saved ? rankedStrip(saved) : manualStrip();

    const tokens = await refreshTikTokTokens(config, refreshToken, fetchImpl);
    if (tokens.refreshToken !== refreshToken) await store.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
    // An empty pool is TikTok's real answer (no public videos), so it replaces the saved ranking.
    const snapshot = tiktokSnapshot(await collectTikTokVideos(tokens.accessToken, TIKTOK_RANK_POOL, fetchImpl), curation, now);
    await store.set(VIDEOS_KEY, JSON.stringify(snapshot));
    return rankedStrip(snapshot);
  } catch (error) {
    console.error("[tiktok] keeping the last saved ranking:", error instanceof Error ? error.message : "unknown error");
    return saved ? rankedStrip(saved) : manualStrip();
  }
}

export const TIKTOK_VIDEOS_TAG = "tiktok-videos";

/**
 * The homepage's copy, read at most every 12 hours; TikTok itself is asked
 * only when the saved ranking is a week old. The connect callback clears it.
 */
export const getCachedTikTokStrip = unstable_cache(() => getTikTokStrip(), ["tiktok-weekly-strip"], {
  revalidate: 43_200,
  tags: [TIKTOK_VIDEOS_TAG],
});
