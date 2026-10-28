import { afterEach, describe, expect, it, vi } from "vitest";
import { SOCIAL_HIGHLIGHTS } from "@/lib/social-highlights";
import type { KeyValueStore } from "@/lib/social/kv-store";
import { X_API_ORIGIN } from "./api";
import { getXConfig } from "./config";
import { getXStrip, X_POSTS_KEY, X_USER_ID_KEY } from "./latest-posts";

// Every X and Upstash call below is a mocked fetch; nothing leaves the test.
class MemoryStore implements KeyValueStore {
  values = new Map<string, string>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.values.set(key, value);
  }
}

const config = { bearerToken: "bt", username: "SafrBwai", userId: null };
const NOW = Date.parse("2026-10-28T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

const POSTS = [
  { id: "1", text: "أول\nسطر ثانٍ", impressions: 1200 },
  { id: "2", text: "Second", impressions: 300 },
  { id: "3", text: "Third", impressions: 5000 },
  { id: "4", text: "Fourth", impressions: 800 },
  { id: "5", text: "No metrics", impressions: undefined },
];

function xFetch({ status = 200 } = {}) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    if (status === 429) return json({}, 429, { "x-rate-limit-reset": "1793200000" });
    if (url === `${X_API_ORIGIN}/2/users/by/username/SafrBwai`) return json({ data: { id: "999" } });
    if (url.startsWith(`${X_API_ORIGIN}/2/users/999/tweets?`)) {
      return json({
        data: POSTS.map((post) => ({
          id: post.id,
          text: post.text,
          created_at: "2026-10-01T00:00:00.000Z",
          public_metrics: post.impressions === undefined ? {} : { impression_count: post.impressions, like_count: 1 },
        })),
      });
    }
    throw new Error(`unexpected ${url}`);
  });
}

afterEach(() => vi.restoreAllMocks());

describe("X config", () => {
  it("is off without a bearer token and only accepts a numeric user id", () => {
    expect(getXConfig({})).toBeNull();
    expect(getXConfig({ X_BEARER_TOKEN: "t", X_USER_ID: "abc" })).toEqual({ bearerToken: "t", username: "SafrBwai", userId: null });
    expect(getXConfig({ X_BEARER_TOKEN: "t", X_USER_ID: "42" })?.userId).toBe("42");
  });
});

describe("weekly X strip", () => {
  it("shows the hand-picked list, labelled manual, without API access", async () => {
    const fetchImpl = vi.fn();
    const strip = await getXStrip({ config: null, store: new MemoryStore(), fetchImpl, now: NOW });
    expect(strip.source).toBe("manual");
    expect(strip.items).toEqual(SOCIAL_HIGHLIGHTS.x);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ranks the latest original posts by X impressions, never estimating a missing count", async () => {
    const store = new MemoryStore();
    const fetchImpl = xFetch();
    const strip = await getXStrip({ config, store, fetchImpl, now: NOW });
    expect(strip.items.map((item) => item.href)).toEqual(
      ["3", "1", "4", "2"].map((id) => `https://x.com/SafrBwai/status/${id}`)
    );
    expect(strip).toMatchObject({ source: "ranked", poolSize: 5, refreshedAt: new Date(NOW).toISOString() });
    expect(strip.items[1].title.ar).toBe("أول");
    expect(store.values.get(X_USER_ID_KEY)).toBe("999");
    const timeline = new URL(String(fetchImpl.mock.calls[1][0]));
    expect(timeline.searchParams.get("exclude")).toBe("retweets,replies");
    expect(timeline.searchParams.get("max_results")).toBe("100");
    expect(timeline.searchParams.get("tweet.fields")).toBe("public_metrics,created_at");
    expect(fetchImpl.mock.calls[1][1]?.headers).toMatchObject({ authorization: "Bearer bt" });
  });

  it("puts pinned posts first and drops excluded ones", async () => {
    const strip = await getXStrip({
      config,
      store: new MemoryStore(),
      fetchImpl: xFetch(),
      now: NOW,
      curation: { pinned: ["2"], excluded: ["3"] },
    });
    expect(strip.items.map((item) => item.id)).toEqual(["x-2", "x-1", "x-4", "x-5"]);
  });

  it("asks X at most once a week", async () => {
    const store = new MemoryStore();
    await getXStrip({ config, store, fetchImpl: xFetch(), now: NOW });
    const again = xFetch();
    await getXStrip({ config, store, fetchImpl: again, now: NOW + 6 * DAY });
    expect(again).not.toHaveBeenCalled();
    await getXStrip({ config, store, fetchImpl: again, now: NOW + 8 * DAY });
    expect(again).toHaveBeenCalled();
  });

  it("keeps the last ranking, with its date, on a rate limit; falls back to the manual list when there is none", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const store = new MemoryStore();
    await getXStrip({ config, store, fetchImpl: xFetch(), now: NOW });
    const limited = await getXStrip({ config, store, fetchImpl: xFetch({ status: 429 }), now: NOW + 8 * DAY });
    expect(limited.refreshedAt).toBe(new Date(NOW).toISOString());
    expect(limited.items).toHaveLength(4);
    expect(JSON.parse(store.values.get(X_POSTS_KEY) ?? "{}").refreshedAt).toBe(new Date(NOW).toISOString());

    const empty = await getXStrip({ config, store: new MemoryStore(), fetchImpl: xFetch({ status: 429 }), now: NOW });
    expect(empty.source).toBe("manual");
  });
});
