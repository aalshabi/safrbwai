import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Pre-launch phase: the sitemap is EMPTY, matching `robots.ts` (which disallows
 * everything) and the site-wide `robots: { index: false }` metadata. Publishing
 * a list of URLs while asking crawlers to ignore them is a contradiction, and
 * the list is the half that invites indexing.
 *
 * At launch, flip PRE_LAUNCH to false and this returns the real routes.
 */
const PRE_LAUNCH = true;

export default function sitemap(): MetadataRoute.Sitemap {
  if (PRE_LAUNCH) return [];

  const routes = [
    "",
    "/analyze-hotel",
    "/analyze-destination",
    "/analyze-offer",
    "/compare-hotels",
    "/knowledge",
    "/auth",
    "/privacy",
    "/terms",
  ];
  const now = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));
}
