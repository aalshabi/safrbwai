import type { Metadata } from "next";

/**
 * Per-page metadata for every page except the homepage.
 *
 * The root layout's `openGraph`/`twitter` describe the homepage. A page that
 * sets only `title`/`description` inherits them, so its shares would point at
 * the homepage (`og:url`, `og:title`). This helper gives each page its own
 * canonical, Open Graph and Twitter card. It deliberately lives outside
 * `seo.ts` (imported by the root layout) so the homepage is untouched.
 */

/** The site name used in the root layout's Open Graph data. */
export const OG_SITE_NAME = "SafrBwai";

/** Share images (1200×630) under /public/og, one per section. */
export const OG_IMAGES = {
  site: "/og/site.png",
  tools: "/og/tools.png",
  guides: "/og/guides.png",
  insights: "/og/insights.png",
} as const;

export type OgImageKey = keyof typeof OG_IMAGES;

export type PageMetadataInput = {
  /** The `<title>` text; the root layout appends « | سافر بوعي». */
  title: string;
  description: string;
  /** Canonical path, e.g. "/guides". */
  path: string;
  image: OgImageKey;
  robots?: Metadata["robots"];
  /** Article pages also carry their publication dates. */
  article?: { publishedTime: string; modifiedTime?: string };
};

export function pageMetadata({ title, description, path, image, robots, article }: PageMetadataInput): Metadata {
  const images = [{ url: OG_IMAGES[image], width: 1200, height: 630, alt: title }];
  const shared = { url: path, title, description, siteName: OG_SITE_NAME, locale: "ar_SA", images };
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(robots ? { robots } : {}),
    openGraph: article
      ? { ...shared, type: "article", publishedTime: article.publishedTime, modifiedTime: article.modifiedTime }
      : { ...shared, type: "website" },
    // A page-level `twitter` object replaces the root one, so the card type is restated.
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGES[image]] },
  };
}
