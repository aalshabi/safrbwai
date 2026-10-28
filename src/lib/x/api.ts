import type { XConfig } from "./config";

export const X_API_ORIGIN = "https://api.x.com";
/**
 * The ranking pool: the account's most recent original posts (no reposts or
 * replies), one page of up to 100 from the user posts timeline.
 */
export const X_RANK_POOL = 100;

const TIMEOUT_MS = 8_000;

/** `impressions` is X's public_metrics.impression_count for the post; null when X did not return it. */
export type XPost = { id: string; text: string; createdAt: string; impressions: number | null };

export class XRateLimitError extends Error {
  constructor(readonly resetAt: number | null) {
    super(`X rate limit reached${resetAt ? ` until ${new Date(resetAt * 1000).toISOString()}` : ""}`);
  }
}

async function getJson(url: string, config: XConfig, fetchImpl: typeof fetch): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, {
    headers: { authorization: `Bearer ${config.bearerToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 429) {
    const reset = Number(response.headers.get("x-rate-limit-reset"));
    throw new XRateLimitError(Number.isFinite(reset) && reset > 0 ? reset : null);
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`X API request failed with status ${response.status}`);
  return body;
}

export async function lookupXUserId(config: XConfig, fetchImpl: typeof fetch = fetch): Promise<string> {
  const body = await getJson(`${X_API_ORIGIN}/2/users/by/username/${config.username}`, config, fetchImpl);
  const id = (body.data as { id?: unknown } | undefined)?.id;
  if (typeof id !== "string" || !/^\d+$/.test(id)) throw new Error("X user lookup returned no id");
  return id;
}

export async function listXPosts(config: XConfig, userId: string, fetchImpl: typeof fetch = fetch): Promise<XPost[]> {
  const params = new URLSearchParams({
    max_results: String(X_RANK_POOL),
    exclude: "retweets,replies",
    "tweet.fields": "public_metrics,created_at",
  });
  const body = await getJson(`${X_API_ORIGIN}/2/users/${userId}/tweets?${params}`, config, fetchImpl);
  const data = Array.isArray(body.data) ? (body.data as Array<Record<string, unknown>>) : [];
  return data
    .filter((post) => typeof post.id === "string" && /^\d+$/.test(post.id))
    .map((post) => {
      const impressions = (post.public_metrics as { impression_count?: unknown } | undefined)?.impression_count;
      return {
        id: post.id as string,
        text: typeof post.text === "string" ? post.text : "",
        createdAt: typeof post.created_at === "string" ? post.created_at : "",
        impressions: typeof impressions === "number" && Number.isFinite(impressions) ? impressions : null,
      };
    });
}
