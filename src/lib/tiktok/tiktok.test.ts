import { afterEach, describe, expect, it, vi } from "vitest";
import { collectTikTokVideos, TIKTOK_TOKEN_URL, TIKTOK_VIDEO_LIST_URL, tiktokAuthorizeUrl } from "./api";
import { describeTikTokSetup, getTikTokConfig, getTikTokStoreConfig, TIKTOK_REDIRECT_URI, type TikTokConfig } from "./config";
import { createTikTokState, handleTikTokCallback, handleTikTokConnect, isValidTikTokState, STATE_COOKIE } from "./connect";
import { getTikTokStrip, tiktokHighlights } from "./latest-videos";
import { REFRESH_TOKEN_KEY, UpstashTikTokStore, VIDEOS_KEY, type TikTokStore } from "./store";

// Every TikTok and Upstash call below is a mocked fetch; nothing leaves the test.
const config: TikTokConfig = {
  clientKey: "ck",
  clientSecret: "cs",
  connectKey: "k".repeat(32),
  redirectUri: TIKTOK_REDIRECT_URI,
};

class MemoryStore implements TikTokStore {
  values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.values.set(key, value);
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
/** TikTok's own view counts for the sample videos; ranking by views differs from recency on purpose. */
const VIEWS: Record<string, number> = { "11": 500, "22": 100, "33": 900, "44": 50, "55": 300 };
const videosResponse = (ids: string[]) =>
  json({
    data: {
      videos: ids.map((id, i) => ({ id, title: `Video ${id}`, create_time: 1_700_000_000 + i, view_count: VIEWS[id] })),
      cursor: 0,
      has_more: false,
    },
    error: { code: "ok" },
  });
const NOW = Date.parse("2026-10-28T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const snapshot = (ids: string[], refreshedAt: number) =>
  JSON.stringify({
    version: 2,
    refreshedAt: new Date(refreshedAt).toISOString(),
    poolSize: 40,
    entries: ids.map((id) => ({ id, title: `Saved ${id}`, description: "", createTime: 1, viewCount: 10 })),
  });

/** Answers the token endpoint and the video list the way TikTok documents them. */
function tiktokFetch({ refreshToken = "r2", ids = ["11", "22", "33", "44", "55"], tokenStatus = 200 } = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === TIKTOK_TOKEN_URL) {
      if (tokenStatus !== 200) return json({ error: "invalid_grant" }, tokenStatus);
      const grant = new URLSearchParams(String(init?.body)).get("grant_type");
      return json({
        access_token: `access-${grant}`,
        refresh_token: refreshToken,
        scope: "user.info.basic,video.list",
      });
    }
    if (url === TIKTOK_VIDEO_LIST_URL) return videosResponse(ids);
    throw new Error(`unexpected ${url}`);
  });
}

afterEach(() => vi.restoreAllMocks());

describe("TikTok config", () => {
  it("is off until the app keys and a long connect key are set", () => {
    const env = { TIKTOK_CLIENT_KEY: "ck", TIKTOK_CLIENT_SECRET: "cs", TIKTOK_CONNECT_KEY: "k".repeat(32) };
    expect(getTikTokConfig({})).toBeNull();
    expect(getTikTokConfig({ ...env, TIKTOK_CONNECT_KEY: "short" })).toBeNull();
    expect(getTikTokConfig(env)).toEqual(config);
    expect(TIKTOK_REDIRECT_URI).toBe("https://www.safrbwai.com/api/tiktok/callback");
  });

  it("reads the store from the Vercel Upstash variables, over https only", () => {
    expect(getTikTokStoreConfig({ KV_REST_API_URL: "https://x.upstash.io/", KV_REST_API_TOKEN: "t" })).toEqual({
      url: "https://x.upstash.io",
      token: "t",
    });
    expect(getTikTokStoreConfig({ UPSTASH_REDIS_REST_URL: "http://x", UPSTASH_REDIS_REST_TOKEN: "t" })).toBeNull();
  });
});

describe("TikTok setup log", () => {
  it("names what is missing and similar names that are set, never a value", () => {
    const text = describeTikTokSetup({
      TIKTOK_CLIENT_KEY: "ck-value",
      TIKTOK_CLIENTSECRET: "secret-value",
      TIKTOK_CONNECT_KEY: "short-value",
      KV_REST_API_URL: "https://x.upstash.io",
      KV_REST_API_TOKEN: "token-value",
      PATH: "/usr/bin",
    });
    expect(text).toBe(
      "missing: TIKTOK_CLIENT_SECRET, TIKTOK_CONNECT_KEY (shorter than 24 characters); " +
        "similar names set: KV_REST_API_TOKEN, KV_REST_API_URL, TIKTOK_CLIENTSECRET, TIKTOK_CLIENT_KEY, TIKTOK_CONNECT_KEY"
    );
    expect(text).not.toMatch(/value|upstash\.io|usr/);
  });

  it("reports nothing missing once everything is set", () => {
    const env = {
      TIKTOK_CLIENT_KEY: "ck",
      TIKTOK_CLIENT_SECRET: "cs",
      TIKTOK_CONNECT_KEY: "k".repeat(32),
      KV_REST_API_URL: "https://x.upstash.io",
      KV_REST_API_TOKEN: "t",
    };
    expect(describeTikTokSetup(env)).toMatch(/^missing: none;/);
  });
});

describe("TikTok connect", () => {
  it("answers 404 without the right key", () => {
    expect(handleTikTokConnect(new Request("https://s/api/tiktok/connect?key=nope"), config).status).toBe(404);
    expect(handleTikTokConnect(new Request(`https://s/api/tiktok/connect?key=${config.connectKey}`), null).status).toBe(404);
  });

  it("sends the owner to TikTok's consent screen with a state cookie", () => {
    const response = handleTikTokConnect(new Request(`https://s/api/tiktok/connect?key=${config.connectKey}`), config);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    const state = location.searchParams.get("state");
    expect(location.origin + location.pathname).toBe("https://www.tiktok.com/v2/auth/authorize/");
    expect(location.searchParams.get("scope")).toBe("user.info.basic,video.list");
    expect(location.searchParams.get("redirect_uri")).toBe(TIKTOK_REDIRECT_URI);
    expect(location.searchParams.get("client_key")).toBe("ck");
    expect(isValidTikTokState(config, state ?? "")).toBe(true);
    expect(response.headers.get("set-cookie")).toContain(`${STATE_COOKIE}=${state}; Path=/api/tiktok`);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure");
    expect(tiktokAuthorizeUrl(config, "s")).not.toContain("cs");
  });
});

describe("TikTok callback", () => {
  const callback = (state: string, cookie: string | null, code = "abc") =>
    new Request(`https://s/api/tiktok/callback?code=${code}&state=${state}`, {
      headers: cookie ? { cookie: `${STATE_COOKIE}=${cookie}` } : {},
    });

  it("refuses a missing, different, forged or expired state and stores nothing", async () => {
    const store = new MemoryStore();
    const fetchImpl = tiktokFetch();
    const valid = createTikTokState(config);
    const forged = createTikTokState({ ...config, connectKey: "x".repeat(32) });
    const expired = createTikTokState(config, Date.now() - 11 * 60_000);
    for (const request of [
      callback(valid, null),
      callback(valid, createTikTokState(config)),
      // A direct request can set any cookie; without the connect key's signature it gets nowhere.
      callback(forged, forged),
      callback("a", "a"),
      callback(expired, expired),
    ]) {
      expect((await handleTikTokCallback(request, { config, store, fetchImpl }, vi.fn())).status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(store.values.size).toBe(0);
  });

  it("stores the refresh token and the four most-viewed videos, then refreshes the homepage", async () => {
    const store = new MemoryStore();
    const revalidate = vi.fn();
    const state = createTikTokState(config);
    const response = await handleTikTokCallback(callback(state, state), { config, store, fetchImpl: tiktokFetch() }, revalidate);
    expect(response.status).toBe(200);
    expect(store.values.get(REFRESH_TOKEN_KEY)).toBe("r2");
    const saved = JSON.parse(store.values.get(VIDEOS_KEY) ?? "{}");
    expect(saved.entries.map((v: { id: string }) => v.id)).toEqual(["33", "11", "55", "22"]);
    expect(saved.poolSize).toBe(5);
    expect(Date.parse(saved.refreshedAt)).not.toBeNaN();
    expect(revalidate).toHaveBeenCalledOnce();
    // Neither the tokens nor the client secret appear on the page.
    const text = await response.text();
    expect(text).not.toMatch(/r2|access-|cs/);
  });
});

describe("weekly TikTok strip", () => {
  it("shows the hand-picked list, and asks nothing, until TikTok and the store are configured", async () => {
    const fetchImpl = vi.fn();
    for (const strip of [
      await getTikTokStrip({ config: null, store: new MemoryStore(), fetchImpl, now: NOW }),
      await getTikTokStrip({ config, store: null, fetchImpl, now: NOW }),
    ]) {
      expect(strip.source).toBe("manual");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reuses a ranking under a week old without calling TikTok", async () => {
    const store = new MemoryStore();
    store.values.set(REFRESH_TOKEN_KEY, "r1");
    store.values.set(VIDEOS_KEY, snapshot(["77"], NOW - 6 * DAY));
    const fetchImpl = tiktokFetch();
    const strip = await getTikTokStrip({ config, store, fetchImpl, now: NOW });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(strip).toMatchObject({ source: "ranked", poolSize: 40, refreshedAt: new Date(NOW - 6 * DAY).toISOString() });
    expect(strip.items.map((h) => h.href)).toEqual(["https://www.tiktok.com/@safrbwai/video/77"]);
  });

  it("re-ranks by TikTok's view count once the ranking is a week old, keeping the new refresh token", async () => {
    const store = new MemoryStore();
    store.values.set(REFRESH_TOKEN_KEY, "r1");
    store.values.set(VIDEOS_KEY, snapshot(["77"], NOW - 8 * DAY));
    const fetchImpl = tiktokFetch({ refreshToken: "r2" });
    const strip = await getTikTokStrip({ config, store, fetchImpl, now: NOW });

    expect(strip.items.map((h) => h.href)).toEqual(
      ["33", "11", "55", "22"].map((id) => `https://www.tiktok.com/@safrbwai/video/${id}`)
    );
    expect(strip).toMatchObject({ source: "ranked", poolSize: 5, refreshedAt: new Date(NOW).toISOString() });
    expect(store.values.get(REFRESH_TOKEN_KEY)).toBe("r2");
    const refreshBody = new URLSearchParams(String(fetchImpl.mock.calls[0][1]?.body));
    expect(refreshBody.get("grant_type")).toBe("refresh_token");
    expect(refreshBody.get("refresh_token")).toBe("r1");
    expect(fetchImpl.mock.calls[1][1]?.headers).toMatchObject({ authorization: "Bearer access-refresh_token" });
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({ max_count: 20 });
  });

  it("applies pins and exclusions to the ranking", async () => {
    const store = new MemoryStore();
    store.values.set(REFRESH_TOKEN_KEY, "r1");
    const strip = await getTikTokStrip({
      config,
      store,
      fetchImpl: tiktokFetch(),
      now: NOW,
      curation: { pinned: ["44"], excluded: ["33"] },
    });
    expect(strip.items.map((h) => h.id)).toEqual(["tiktok-44", "tiktok-11", "tiktok-55", "tiktok-22"]);
  });

  it("keeps the last ranking, with its real date, when the refresh fails", async () => {
    const store = new MemoryStore();
    store.values.set(REFRESH_TOKEN_KEY, "r1");
    store.values.set(VIDEOS_KEY, snapshot(["77"], NOW - 9 * DAY));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const strip = await getTikTokStrip({ config, store, fetchImpl: tiktokFetch({ tokenStatus: 400 }), now: NOW });
    expect(strip.items.map((h) => h.href)).toEqual(["https://www.tiktok.com/@safrbwai/video/77"]);
    expect(strip.refreshedAt).toBe(new Date(NOW - 9 * DAY).toISOString());
    expect(store.values.get(REFRESH_TOKEN_KEY)).toBe("r1");
  });

  it("saves an empty ranking when the account has no public videos left", async () => {
    const store = new MemoryStore();
    store.values.set(REFRESH_TOKEN_KEY, "r1");
    store.values.set(VIDEOS_KEY, snapshot(["77"], NOW - 8 * DAY));
    const strip = await getTikTokStrip({ config, store, fetchImpl: tiktokFetch({ ids: [] }), now: NOW });
    expect(strip.items).toEqual([]);
    expect(JSON.parse(store.values.get(VIDEOS_KEY) ?? "{}").entries).toEqual([]);
  });

  it("titles a video by its first line, with a default when TikTok gives none", () => {
    const [first, second] = tiktokHighlights([
      { id: "1", title: "", description: "\nأول سطر\nثاني سطر", createTime: 0, viewCount: null },
      { id: "2", title: "", description: "", createTime: 0, viewCount: null },
    ]);
    expect(first.title.ar).toBe("أول سطر");
    expect(second.title.ar).toBe("فيديو من سافر بوعي");
  });
});

describe("collectTikTokVideos", () => {
  it("follows the cursor page by page until TikTok reports no more", async () => {
    const pages = [
      { videos: [{ id: "1", view_count: 3 }], cursor: 111, has_more: true },
      { videos: [{ id: "2", view_count: 7 }], cursor: 222, has_more: false },
    ];
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ data: pages.shift(), error: { code: "ok" } }));
    const videos = await collectTikTokVideos("token", 60, fetchImpl);
    expect(videos.map((video) => [video.id, video.viewCount])).toEqual([["1", 3], ["2", 7]]);
    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      { max_count: 20 },
      { max_count: 20, cursor: 111 },
    ]);
  });
});

describe("UpstashTikTokStore", () => {
  it("sends one Redis command per call with the bearer token", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => json({ result: "value" }));
    const store = new UpstashTikTokStore({ url: "https://x.upstash.io", token: "t" }, fetchImpl);
    expect(await store.get("k")).toBe("value");
    await store.set("k", "v");
    expect(fetchImpl.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      ["GET", "k"],
      ["SET", "k", "v"],
    ]);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://x.upstash.io");
    expect(fetchImpl.mock.calls[0][1]?.headers).toMatchObject({ authorization: "Bearer t" });
  });
});
