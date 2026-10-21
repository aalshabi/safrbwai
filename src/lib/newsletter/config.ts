/**
 * The newsletter signup is on only when explicitly enabled and Wati is
 * configured. Server-only: the token never reaches the browser.
 */
export type WatiConfig = { endpoint: string; token: string };

export function getWatiConfig(env: Record<string, string | undefined> = process.env): WatiConfig | null {
  if (env.NEWSLETTER_ENABLED !== "true") return null;
  const endpoint = env.WATI_API_ENDPOINT?.trim().replace(/\/+$/, "");
  const token = env.WATI_API_TOKEN?.trim();
  if (!endpoint?.startsWith("https://") || !token) return null;
  return { endpoint, token };
}

export function isNewsletterEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return getWatiConfig(env) !== null;
}
