import type { MetadataRoute } from "next";
import { isFeatureEnabled } from "@/lib/product/capabilities";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Crawling follows the `publicIndexing` capability, in sync with the site-wide
 * robots metadata in src/lib/seo.ts. Before the public launch every path is
 * disallowed; after it, private pages and APIs stay disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isFeatureEnabled("publicIndexing")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/auth", "/dashboard"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
