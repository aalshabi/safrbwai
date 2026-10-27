import type { TikTokConfig } from "./config";

export const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_VIDEO_LIST_URL =
  "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time";
export const TIKTOK_SCOPES = "user.info.basic,video.list";

const TIMEOUT_MS = 8_000;

export type TikTokTokens = { accessToken: string; refreshToken: string; scope: string };

export type TikTokVideo = { id: string; title: string; description: string; createTime: number };

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

/** The account's newest videos, newest first. */
export async function listTikTokVideos(
  accessToken: string,
  maxCount: number,
  fetchImpl: typeof fetch = fetch
): Promise<TikTokVideo[]> {
  const response = await fetchImpl(TIKTOK_VIDEO_LIST_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ max_count: maxCount }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: { videos?: Array<Record<string, unknown>> };
    error?: { code?: string };
  };
  const code = body.error?.code ?? "";
  if (!response.ok || (code && code !== "ok") || !Array.isArray(body.data?.videos)) {
    throw new Error(`TikTok video list failed: ${response.status} ${code}`.trim());
  }
  return body.data.videos
    .filter((video) => typeof video.id === "string" && /^\d+$/.test(video.id))
    .map((video) => ({
      id: video.id as string,
      title: typeof video.title === "string" ? video.title : "",
      description: typeof video.video_description === "string" ? video.video_description : "",
      createTime: typeof video.create_time === "number" ? video.create_time : 0,
    }))
    .sort((a, b) => b.createTime - a.createTime)
    .slice(0, maxCount);
}
