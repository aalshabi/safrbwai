import { isFeatureEnabled } from "@/lib/product/capabilities";

/**
 * SEO constants.
 *
 * Search engines may index the site only while the `publicIndexing`
 * capability is enabled, which the public launch gate requires. Private pages
 * (/admin, /auth, /dashboard) keep their own `noindex` metadata.
 */
const INDEXABLE = isFeatureEnabled("publicIndexing");

export const SITE_ROBOTS = {
  index: INDEXABLE,
  follow: INDEXABLE,
} as const;

export const SITE_TITLE_AR = "قبل لا تدفع… افهم قرار سفرك.";
export const SITE_TITLE_EN = "Understand your travel decision before you pay.";

export const SITE_DESCRIPTION =
  "سافر بوعي أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز. SafrBwai helps you review the information stated in travel offers and make a clearer decision before booking.";
