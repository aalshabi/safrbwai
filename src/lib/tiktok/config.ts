import { SAFRBWAI_URL } from "@/lib/result-actions/format-questions";

/**
 * TikTok Display API access for the homepage videos. Server-only: the client
 * secret, the connect key and the stored tokens never reach the browser.
 */
export type TikTokConfig = {
  clientKey: string;
  clientSecret: string;
  /** Guards /api/tiktok/connect so only the site owner can link the account. */
  connectKey: string;
  redirectUri: string;
};

/** Where the refresh token and the last good video list are kept (Upstash Redis REST). */
export type TikTokStoreConfig = { url: string; token: string };

export const TIKTOK_REDIRECT_URI = `${SAFRBWAI_URL}/api/tiktok/callback`;

export function getTikTokConfig(env: Record<string, string | undefined> = process.env): TikTokConfig | null {
  const clientKey = env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = env.TIKTOK_CLIENT_SECRET?.trim();
  const connectKey = env.TIKTOK_CONNECT_KEY?.trim();
  if (!clientKey || !clientSecret || !connectKey || connectKey.length < 24) return null;
  return { clientKey, clientSecret, connectKey, redirectUri: TIKTOK_REDIRECT_URI };
}

/** Reads the variables the Vercel Upstash integration adds (KV_REST_API_*), or Upstash's own names. */
export function getTikTokStoreConfig(env: Record<string, string | undefined> = process.env): TikTokStoreConfig | null {
  const url = (env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL)?.trim().replace(/\/+$/, "");
  const token = (env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN)?.trim();
  if (!url?.startsWith("https://") || !token) return null;
  return { url, token };
}
