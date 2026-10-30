import type { TikTokConfig } from "./config";

export const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_VIDEO_LIST_URL =
  "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,view_count";
export const TIKTOK_SCOPES = "user.info.basic,video.list";

const TIMEOUT_MS = 8_000;

export type TikTokTokens = { accessToken: string; refreshToken: string; scope: string };

/** `viewCount` is TikTok's own view_count; null when TikTok did not return it (never estimated). */
export type TikTokVideo = { id: string; title: string; description: string; createTime: number; viewCount: number | null };

/** One page of /v2/video/list/ (newest first, at most 20 per page). */
export type TikTokVideoPage = { videos: TikTokVideo[]; cursor: number | null; hasMore: boolean };

export const TIKTOK_PAGE_MAX = 20;

export function tiktokAuthorizeUrl(config: TikTokConfig, state: string): string {
  const params = new URLSearchParams({
    client_key: config.clientKey,
    scope: TIKTOK_SCOPES,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
  });
  return `${TIKTOK_AUTHORIZE_URL}?${params}`;
}

async function requestTokens(
  config: TikTokConfig,
  grant: Record<string, string>,
  fetchImpl: typeof fetch
): Promise<TikTokTokens> {
  const response = await fetchImpl(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: config.clientKey, client_secret: config.clientSecret, ...grant }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof data.access_token !== "string" || typeof data.refresh_token !== "string") {
    // TikTok's error code only (e.g. invalid_grant); never the request or the tokens.
    throw new Error(`TikTok token request failed: ${response.status} ${String(data.error ?? "")}`.trim());
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    scope: typeof data.scope === "string" ? data.scope : "",
  };
}

export function exchangeTikTokCode(config: TikTokConfig, code: string, fetchImpl: typeof fetch = fetch) {
  return requestTokens(
    config,
    { code, grant_type: "authorization_code", redirect_uri: config.redirectUri },
    fetchImpl
  );
}

/** TikTok may return a new refresh token; the caller must keep whichever comes back. */
export function refreshTikTokTokens(config: TikTokConfig, refreshToken: string, fetchImpl: typeof fetch = fetch) {
  return requestTokens(config, { grant_type: "refresh_token", refresh_token: refreshToken }, fetchImpl);
}

/** One page of the account's videos, newest first; pass the previous page's cursor for the next. */
export async function listTikTokVideoPage(
  accessToken: string,
  maxCount: number,
  fetchImpl: typeof fetch = fetch,
  cursor: number | null = null
): Promise<TikTokVideoPage> {
  const response = await fetchImpl(TIKTOK_VIDEO_LIST_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(cursor === null ? { max_count: maxCount } : { max_count: maxCount, cursor }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: { videos?: Array<Record<string, unknown>>; cursor?: unknown; has_more?: unknown };
    error?: { code?: string };
  };
  const code = body.error?.code ?? "";
  if (!response.ok || (code && code !== "ok") || !Array.isArray(body.data?.videos)) {
    throw new Error(`TikTok video list failed: ${response.status} ${code}`.trim());
  }
  const videos = body.data.videos
    .filter((video) => typeof video.id === "string" && /^\d+$/.test(video.id))
    .map((video) => ({
      id: video.id as string,
      title: typeof video.title === "string" ? video.title : "",
      description: typeof video.video_description === "string" ? video.video_description : "",
      createTime: typeof video.create_time === "number" ? video.create_time : 0,
      viewCount: typeof video.view_count === "number" && Number.isFinite(video.view_count) ? video.view_count : null,
    }));
  return {
    videos,
    cursor: typeof body.data.cursor === "number" ? body.data.cursor : null,
    hasMore: body.data.has_more === true,
  };
}

/** The account's newest videos, newest first. */
export async function listTikTokVideos(
  accessToken: string,
  maxCount: number,
  fetchImpl: typeof fetch = fetch
): Promise<TikTokVideo[]> {
  const page = await listTikTokVideoPage(accessToken, Math.min(maxCount, TIKTOK_PAGE_MAX), fetchImpl);
  return page.videos.sort((a, b) => b.createTime - a.createTime).slice(0, maxCount);
}

/**
 * Up to `poolSize` of the newest videos, page by page (at most 20 a page),
 * stopping when TikTok reports no more.
 */
export async function collectTikTokVideos(
  accessToken: string,
  poolSize: number,
  fetchImpl: typeof fetch = fetch
): Promise<TikTokVideo[]> {
  const pool: TikTokVideo[] = [];
  let cursor: number | null = null;
  while (pool.length < poolSize) {
    const page = await listTikTokVideoPage(accessToken, TIKTOK_PAGE_MAX, fetchImpl, cursor);
    pool.push(...page.videos);
    if (!page.hasMore || page.cursor === null || page.videos.length === 0) break;
    cursor = page.cursor;
  }
  return pool.slice(0, poolSize);
}
