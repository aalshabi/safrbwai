import type { MetadataRoute } from "next";
import { getReviewedGuides } from "@/lib/guides";
import { isFeatureEnabled } from "@/lib/product/capabilities";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isFeatureEnabled("publicIndexing")) return [];
  const routes = [
    "",
    "/analyze-offer",
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
