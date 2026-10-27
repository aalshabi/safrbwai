import { unstable_cache } from "next/cache";
import { MAX_HIGHLIGHTS, type SocialHighlight } from "@/lib/social-highlights";
import { listTikTokVideos, refreshTikTokTokens, type TikTokVideo } from "./api";
import { getTikTokConfig, getTikTokStoreConfig, type TikTokConfig } from "./config";
import { REFRESH_TOKEN_KEY, UpstashTikTokStore, VIDEOS_KEY, type TikTokStore } from "./store";

export type LatestVideosDeps = {
  config: TikTokConfig | null;
  store: TikTokStore | null;
  fetchImpl?: typeof fetch;
};

function defaultDeps(): LatestVideosDeps {
  const storeConfig = getTikTokStoreConfig();
  return { config: getTikTokConfig(), store: storeConfig ? new UpstashTikTokStore(storeConfig) : null };
}

const TITLE_LIMIT = 70;

function shorten(text: string): string {
  const line = text.split("\n").map((part) => part.trim()).find(Boolean) ?? "";
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT - 1).trimEnd()}…` : line;
}

/** The videos as homepage highlights; TikTok's own text is shown as written, in both languages. */
export function tiktokHighlights(videos: readonly TikTokVideo[]): SocialHighlight[] {
  return videos.slice(0, MAX_HIGHLIGHTS).map((video) => {
    const text = shorten(video.title || video.description);
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

export function parseStoredVideos(raw: string | null): TikTokVideo[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as TikTokVideo[]).filter((video) => /^\d+$/.test(String(video?.id))) : [];
  } catch {
    return [];
  }
}

/** Saves the newest videos with the token that fetched them. */
export async function saveTikTokConnection(store: TikTokStore, refreshToken: string, videos: readonly TikTokVideo[]) {
  await store.set(REFRESH_TOKEN_KEY, refreshToken);
  await store.set(VIDEOS_KEY, JSON.stringify(videos));
}

/**
 * The account's four newest videos. Renews the access token with the stored
 * refresh token, keeps the refresh token TikTok returns, and saves the list.
 * Any failure (TikTok, the store, an expired connection) falls back to the
 * last list that worked, so the homepage never breaks over it.
 */
export async function getLatestTikTokVideos(deps: LatestVideosDeps = defaultDeps()): Promise<SocialHighlight[]> {
  const { config, store, fetchImpl = fetch } = deps;
  if (!config || !store) return [];

  let lastGood: TikTokVideo[] = [];
  try {
    lastGood = parseStoredVideos(await store.get(VIDEOS_KEY));
    const refreshToken = await store.get(REFRESH_TOKEN_KEY);
    if (!refreshToken) return tiktokHighlights(lastGood);

    const tokens = await refreshTikTokTokens(config, refreshToken, fetchImpl);
    if (tokens.refreshToken !== refreshToken) await store.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
    // An empty list is TikTok's real answer (no public videos), so it replaces the saved one.
    const videos = await listTikTokVideos(tokens.accessToken, MAX_HIGHLIGHTS, fetchImpl);
    await store.set(VIDEOS_KEY, JSON.stringify(videos));
    return tiktokHighlights(videos);
  } catch (error) {
    console.error("[tiktok] using the last saved videos:", error instanceof Error ? error.message : "unknown error");
    return tiktokHighlights(lastGood);
  }
}

export const TIKTOK_VIDEOS_TAG = "tiktok-videos";

/**
 * The homepage's copy: one TikTok round per 12 hours however often the page
 * is rebuilt; the connect callback clears it by tag.
 */
export const getCachedTikTokVideos = unstable_cache(() => getLatestTikTokVideos(), ["tiktok-latest-videos"], {
  revalidate: 43_200,
  tags: [TIKTOK_VIDEOS_TAG],
});
