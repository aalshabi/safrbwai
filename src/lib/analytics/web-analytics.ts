/**
 * Page-view measurement with Vercel Web Analytics (no cookies). Before any
 * page view leaves the browser, its URL is reduced to the path plus campaign
 * (utm_*) parameters: everything else in the query string and the fragment
 * is dropped, so nothing a visitor typed or was linked with is sent.
 */

export const WEB_ANALYTICS_SCRIPT = "/_vercel/insights/script.js";

const CAMPAIGN_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function sanitizeAnalyticsUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  const kept = new URLSearchParams();
  for (const key of CAMPAIGN_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) kept.set(key, value.slice(0, 100));
  }
  const query = kept.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

/** Only on Vercel deployments; local and test runs send nothing. */
export function isWebAnalyticsEnabled(vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV): boolean {
  return vercelEnv === "production" || vercelEnv === "preview";
}
