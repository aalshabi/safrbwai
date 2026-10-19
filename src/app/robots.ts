import type { MetadataRoute } from "next";
import { isIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

/**
 * Crawling follows `isIndexable()`, in sync with the site-wide robots metadata
 * in src/lib/seo.ts. Before the public launch, and on Preview deployments,
 * every path is disallowed; otherwise only APIs are. Private pages (/admin,
 * /auth, /dashboard) stay crawlable on purpose: they carry `noindex`, and a
 * crawler that is blocked from fetching them never sees it.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
