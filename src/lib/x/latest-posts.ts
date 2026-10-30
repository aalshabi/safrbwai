import { unstable_cache } from "next/cache";
import { MAX_HIGHLIGHTS, SOCIAL_CURATION, SOCIAL_HIGHLIGHTS, xPostId, type SocialHighlight } from "@/lib/social-highlights";
import { getKvStoreConfig, UpstashKeyValueStore, type KeyValueStore } from "@/lib/social/kv-store";
import {
  isFresh,
  parseSnapshot,
  rankWithCuration,
  shortTitle,
  type Curation,
  type RankedSnapshot,
  type SocialStrip,
} from "@/lib/social/selection";
import { listXPosts, lookupXUserId, type XPost } from "./api";
import { getXConfig, type XConfig } from "./config";

export const X_POSTS_KEY = "x:posts";
export const X_USER_ID_KEY = "x:user_id";

export type LatestPostsDeps = {
  config: XConfig | null;
  store: KeyValueStore | null;
  fetchImpl?: typeof fetch;
  curation?: Curation;
  now?: number;
};

function defaultDeps(): LatestPostsDeps {
  const storeConfig = getKvStoreConfig();
  return { config: getXConfig(), store: storeConfig ? new UpstashKeyValueStore(storeConfig) : null };
}

function isPost(value: unknown): value is XPost {
  const post = value as Partial<XPost> | null;
  return Boolean(post) && /^\d+$/.test(String(post!.id));
}

/** Ranked posts as highlights; a hand-written card is reused when the post is also in the manual list. */
export function xHighlights(posts: readonly XPost[]): SocialHighlight[] {
  return posts.slice(0, MAX_HIGHLIGHTS).map((post) => {
    const manual = SOCIAL_HIGHLIGHTS.x.find((item) => xPostId(item.href) === post.id);
    if (manual) return manual;
    const text = shortTitle(post.text);
    return {
      id: `x-${post.id}`,
      platform: "x",
      title: { ar: text || "منشور من سافر بوعي", en: text || "A SafrBwai post" },
      description: { ar: "", en: "" },
      action: { ar: "فتح المنشور الأصلي", en: "Open original post" },
      href: `https://x.com/SafrBwai/status/${post.id}`,
    };
  });
}

export function xSnapshot(pool: readonly XPost[], curation: Curation, now: number): RankedSnapshot<XPost> {
  const entries = rankWithCuration(
    pool.map((post) => ({ ...post, metric: post.impressions })),
    curation,
    MAX_HIGHLIGHTS
  ).map(({ metric: _metric, ...post }) => post);
  return { version: 2, refreshedAt: new Date(now).toISOString(), poolSize: pool.length, entries };
}

const rankedStrip = (snapshot: RankedSnapshot<XPost>): SocialStrip => ({
  items: xHighlights(snapshot.entries),
  source: "ranked",
  poolSize: snapshot.poolSize,
  refreshedAt: snapshot.refreshedAt,
});

const manualStrip = (): SocialStrip => ({ items: [...SOCIAL_HIGHLIGHTS.x], source: "manual" });

/**
 * The X strip. With API access it shows the posts with the most impressions
 * (public_metrics.impression_count) among the account's latest original
 * posts, ranked at most once a week; a failure or rate limit keeps the last
 * ranking with its real date. Without access it shows the hand-picked list.
 */
export async function getXStrip(deps: LatestPostsDeps = defaultDeps()): Promise<SocialStrip> {
  const { config, store, fetchImpl = fetch, curation = SOCIAL_CURATION.x, now = Date.now() } = deps;
  if (!config || !store) return manualStrip();

  let saved: RankedSnapshot<XPost> | null = null;
  try {
    saved = parseSnapshot(await store.get(X_POSTS_KEY), isPost);
    if (saved && isFresh(saved, now)) return rankedStrip(saved);

    let userId = config.userId ?? (await store.get(X_USER_ID_KEY));
    if (!userId) {
      userId = await lookupXUserId(config, fetchImpl);
      await store.set(X_USER_ID_KEY, userId);
    }
    const snapshot = xSnapshot(await listXPosts(config, userId, fetchImpl), curation, now);
    // An empty result keeps the manual list rather than an empty strip.
    if (snapshot.entries.length === 0) return saved ? rankedStrip(saved) : manualStrip();
    await store.set(X_POSTS_KEY, JSON.stringify(snapshot));
    return rankedStrip(snapshot);
  } catch (error) {
    console.error("[x] keeping the last saved ranking:", error instanceof Error ? error.message : "unknown error");
    return saved ? rankedStrip(saved) : manualStrip();
  }
}

export const getCachedXStrip = unstable_cache(() => getXStrip(), ["x-weekly-strip"], {
  revalidate: 43_200,
  tags: ["x-posts"],
});
