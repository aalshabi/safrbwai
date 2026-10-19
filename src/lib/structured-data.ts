import { OG_IMAGES, type OgImageKey } from "@/lib/page-metadata";
import { SITE_URL } from "@/lib/site-url";

/**
 * Schema.org JSON-LD for guide and insight pages.
 *
 * Every URL is absolute (Google resolves relative URLs inconsistently in
 * JSON-LD). The homepage keeps its own WebSite JSON-LD in `app/page.tsx`;
 * nothing here is imported by it.
 *
 * `author` names the site, not a person: a personal byline needs the
 * founder's approved wording first (plan item CP5).
 */

const SITE_NAME = "سافر بوعي — SafrBwai";

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

export const SITE_ORGANIZATION = {
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: { "@type": "ImageObject", url: absoluteUrl("/icons/icon-512.png"), width: 512, height: 512 },
} as const;

/** Breadcrumb names, matching the site navigation. */
export const SECTION_NAMES = {
  home: "الرئيسية",
  guides: "أدلة مراجعة العرض",
  insights: "مرصد السفر",
} as const;

export type ArticleJsonLdInput = {
  headline: string;
  description: string;
  path: string;
  image: OgImageKey;
  datePublished?: string;
  dateModified: string;
  inLanguage: string | string[];
};

export function articleJsonLd({ headline, description, path, image, datePublished, dateModified, inLanguage }: ArticleJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: [absoluteUrl(OG_IMAGES[image])],
    ...(datePublished ? { datePublished } : {}),
    dateModified,
    inLanguage,
    mainEntityOfPage: absoluteUrl(path),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: SITE_ORGANIZATION,
  };
}

/** `trail` is the path from the homepage to the current page, inclusive. */
export function breadcrumbJsonLd(trail: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

export function itemListJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map(({ name, path }, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(path),
      name,
    })),
  };
}

/** Serialises JSON-LD for a `<script>` tag; escapes `<` so text can't close it. */
export function jsonLdHtml(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
