/**
 * X API v2 access for the homepage X strip. Server-only: the bearer token
 * never reaches the browser. Off until X_BEARER_TOKEN is set; reading posts is
 * billed by X per resource, so it needs the owner's approval first.
 */
export type XConfig = { bearerToken: string; username: string; userId: string | null };

/** The account the strip ranks: the site's existing X profile link (x.com/SafrBwai). */
export const X_USERNAME = "SafrBwai";

export function getXConfig(env: Record<string, string | undefined> = process.env): XConfig | null {
  const bearerToken = env.X_BEARER_TOKEN?.trim();
  if (!bearerToken) return null;
  const userId = env.X_USER_ID?.trim();
  return { bearerToken, username: X_USERNAME, userId: userId && /^\d+$/.test(userId) ? userId : null };
}
