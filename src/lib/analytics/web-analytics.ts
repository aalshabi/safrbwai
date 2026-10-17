/**
 * Page-view measurement with Vercel Web Analytics (no cookies). Before any
 * page view leaves the browser, its URL is reduced to the path plus campaign
 * (utm_*) parameters: everything else in the query string and the fragment
 * is dropped, so nothing a visitor typed or was linked with is sent.
 */

const DEFAULT_SCRIPT = "/_vercel/insights/script.js";

export type WebAnalyticsScript = { src: string; dataset: Record<string, string> };

type ClientConfig = {
  scriptSrc?: string;
  endpoint?: string;
  viewEndpoint?: string;
  eventEndpoint?: string;
  sessionEndpoint?: string;
  dsn?: string;
};

function absolute(url: string): string {
  return /^(https?:\/\/|\/)/.test(url) ? url : `/${url}`;
}

/**
 * Where the tracking script lives and what it reports to, resolved like
 * @vercel/analytics/next does: Vercel sets these two build-time variables
 * when Web Analytics is on (a project-specific path rather than
 * /_vercel/insights); without them the default path is used.
 */
export function resolveWebAnalyticsScript(
  basePath = process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_BASEPATH,
  configString = process.env.NEXT_PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG,
): WebAnalyticsScript {
  let config: ClientConfig = {};
  if (configString) {
    try {
      config = (JSON.parse(configString) as { analytics?: ClientConfig })?.analytics ?? {};
    } catch {
      // Malformed config: fall back to basePath / the default path.
    }
  }
  const dataset: Record<string, string> = {};
  for (const key of ["viewEndpoint", "eventEndpoint", "sessionEndpoint"] as const) {
    const value = config[key];
    if (value) dataset[key] = absolute(value);
  }
  if (config.dsn) dataset.dsn = config.dsn;
  if (config.endpoint) dataset.endpoint = config.endpoint;
  else if (basePath) dataset.endpoint = absolute(`${basePath}/insights`);
  const src = config.scriptSrc
    ? absolute(config.scriptSrc)
    : basePath
      ? absolute(`${basePath}/insights/script.js`)
      : DEFAULT_SCRIPT;
  return { src, dataset };
}

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
