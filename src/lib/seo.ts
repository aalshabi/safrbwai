import { isPreviewDeployment } from "@/lib/hotel-data/config";
import { isFeatureEnabled } from "@/lib/product/capabilities";

/**
 * SEO constants.
 *
 * Search engines may index the site only while the `publicIndexing`
 * capability is enabled, which the public launch gate requires, and never on a
 * Vercel Preview deployment. Private pages (/admin, /auth, /dashboard) and
 * preview tools keep their own `noindex` metadata.
 */
export function isIndexable(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return isFeatureEnabled("publicIndexing") && !isPreviewDeployment(env);
}

const INDEXABLE = isIndexable();

export const SITE_ROBOTS = {
  index: INDEXABLE,
  follow: INDEXABLE,
} as const;

/** For preview-only tools: kept out of the index, links still followed. */
export const PREVIEW_PAGE_ROBOTS = { index: false, follow: true } as const;

export const SITE_TITLE_AR = "قبل لا تدفع… افهم قرار سفرك.";
export const SITE_TITLE_EN = "Understand your travel decision before you pay.";

export const SITE_DESCRIPTION =
  "سافر بوعي أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز. SafrBwai helps you review the information stated in travel offers and make a clearer decision before booking.";
