"use client";

import * as React from "react";
import { WEB_ANALYTICS_SCRIPT, isWebAnalyticsEnabled, sanitizeAnalyticsUrl } from "@/lib/analytics/web-analytics";

type VaEvent = { type: "pageview" | "event"; url: string };
type VaQueue = (...args: unknown[]) => void;

declare global {
  interface Window {
    va?: VaQueue;
    vaq?: unknown[][];
  }
}

/**
 * Loads Vercel Web Analytics the way @vercel/analytics does (queue, then
 * beforeSend, then the script), without the package: its optional peer
 * dependencies conflict with this project's install.
 */
export function WebAnalytics() {
  React.useEffect(() => {
    if (!isWebAnalyticsEnabled()) return;
    window.va =
      window.va ||
      function (...args: unknown[]) {
        (window.vaq = window.vaq || []).push(args);
      };
    window.va("beforeSend", (event: VaEvent) => {
      const url = sanitizeAnalyticsUrl(event.url);
      return url ? { ...event, url } : null;
    });
    if (document.head.querySelector(`script[src="${WEB_ANALYTICS_SCRIPT}"]`)) return;
    const script = document.createElement("script");
    script.src = WEB_ANALYTICS_SCRIPT;
    script.defer = true;
    document.head.appendChild(script);
  }, []);
  return null;
}
