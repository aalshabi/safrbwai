import {
  createAnalyticsEvent,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from "./events";
import { isWebAnalyticsEnabled } from "./web-analytics";

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void | Promise<void>;
}

/**
 * Vercel Web Analytics custom events, through the same `va` queue the page-view
 * script uses (no cookies; its beforeSend reduces the URL to path + utm_*).
 * Only the allowlisted event name and properties are passed on.
 */
export const vercelAnalyticsTransport: AnalyticsTransport = {
  send(event) {
    if (typeof window === "undefined") return;
    window.va?.("event", { name: event.name, data: { ...event.properties } });
  },
};

/** The approved transport on Vercel deployments; none locally or in tests. */
export function defaultAnalyticsTransport(
  vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
): AnalyticsTransport | undefined {
  return isWebAnalyticsEnabled(vercelEnv) ? vercelAnalyticsTransport : undefined;
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: unknown,
  transport: AnalyticsTransport | undefined = defaultAnalyticsTransport()
): "rejected" | "disabled" | "sent" {
  const event = createAnalyticsEvent(name, properties);
  if (!event) return "rejected";
  if (!transport) return "disabled";
  void transport.send(event);
  return "sent";
}
