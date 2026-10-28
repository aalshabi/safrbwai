import { SAFRBWAI_URL } from "@/lib/result-actions/format-questions";
import { getKvStoreConfig as getTikTokStoreConfig } from "@/lib/social/kv-store";

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

export type { KvStoreConfig as TikTokStoreConfig } from "@/lib/social/kv-store";

export const TIKTOK_REDIRECT_URI = `${SAFRBWAI_URL}/api/tiktok/callback`;

export function getTikTokConfig(env: Record<string, string | undefined> = process.env): TikTokConfig | null {
  const clientKey = env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = env.TIKTOK_CLIENT_SECRET?.trim();
  const connectKey = env.TIKTOK_CONNECT_KEY?.trim();
  if (!clientKey || !clientSecret || !connectKey || connectKey.length < 24) return null;
  return { clientKey, clientSecret, connectKey, redirectUri: TIKTOK_REDIRECT_URI };
}

export { getKvStoreConfig as getTikTokStoreConfig } from "@/lib/social/kv-store";

/**
 * What keeps the TikTok link off, by variable name only (never a value), plus
 * the names of any similar variables that are set, so a misspelt or misplaced
 * name shows up in the server log.
 */
export function describeTikTokSetup(env: Record<string, string | undefined> = process.env): string {
  const missing: string[] = [];
  if (!env.TIKTOK_CLIENT_KEY?.trim()) missing.push("TIKTOK_CLIENT_KEY");
  if (!env.TIKTOK_CLIENT_SECRET?.trim()) missing.push("TIKTOK_CLIENT_SECRET");
  const connectKey = env.TIKTOK_CONNECT_KEY?.trim();
  if (!connectKey) missing.push("TIKTOK_CONNECT_KEY");
  else if (connectKey.length < 24) missing.push("TIKTOK_CONNECT_KEY (shorter than 24 characters)");
  if (!getTikTokStoreConfig(env)) missing.push("KV_REST_API_URL (https) + KV_REST_API_TOKEN");
  const similar = Object.keys(env).filter((name) => /tik|kv_|upstash/i.test(name)).sort();
  return `missing: ${missing.join(", ") || "none"}; similar names set: ${similar.join(", ") || "none"}`;
}
