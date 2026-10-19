import type { MetadataRoute } from "next";
import { getReviewedGuides } from "@/lib/guides";
import { isIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";
import { getPublishedInsights } from "@/lib/travel-insights";

/**
 * Guides and insights report their own review date as `lastModified`, so a
 * crawler can tell which pages actually changed. Other pages have no content
 * date and keep the build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return [];
  const now = new Date();
  const routes: { path: string; lastModified: Date | string }[] = [
    { path: "", lastModified: now },
    { path: "/analyze-offer", lastModified: now },
    { path: "/analyze-hotel", lastModified: now },
    { path: "/guides", lastModified: now },
    ...getReviewedGuides().map((guide) => ({ path: `/guides/${guide.slug}`, lastModified: guide.reviewedAt })),
    { path: "/insights", lastModified: now },
    ...getPublishedInsights().map((insight) => ({
      path: `/insights/${insight.slug}`,
      lastModified: insight.reviewedAt || insight.publishedAt,
    })),
    { path: "/privacy", lastModified: now },
    { path: "/terms", lastModified: now },
  ];
  return routes.map(({ path, lastModified }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
