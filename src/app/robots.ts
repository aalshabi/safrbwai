import type { MetadataRoute } from "next";
import { isIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

/**
 * Crawling follows `isIndexable()`, in sync with the site-wide robots metadata
 * in src/lib/seo.ts. Before the public launch, and on Preview deployments,
 * every path is disallowed; otherwise private pages and APIs stay disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
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
