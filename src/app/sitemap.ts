import type { MetadataRoute } from "next";
import { getReviewedGuides } from "@/lib/guides";
import { isIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return [];
  const routes = [
    "",
    "/analyze-offer",
    "/analyze-hotel",
    "/guides",
    ...getReviewedGuides().map((guide) => `/guides/${guide.slug}`),
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
