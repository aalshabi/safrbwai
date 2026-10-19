import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "./site-url";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdHtml,
  SITE_ORGANIZATION,
} from "./structured-data";

const isAbsolute = (url: string) => new URL(url).origin === SITE_URL;

describe("articleJsonLd", () => {
  const article = articleJsonLd({
    headline: "عنوان",
    description: "وصف",
    path: "/insights/x",
    image: "insights",
    datePublished: "2026-10-14",
    dateModified: "2026-10-15",
    inLanguage: ["ar", "en"],
  });

  it("carries the fields Google reads for articles, with absolute URLs", () => {
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "عنوان",
      datePublished: "2026-10-14",
      dateModified: "2026-10-15",
      mainEntityOfPage: `${SITE_URL}/insights/x`,
      image: [`${SITE_URL}/og/insights.png`],
      author: { "@type": "Organization", url: SITE_URL },
      publisher: SITE_ORGANIZATION,
    });
    expect(isAbsolute(SITE_ORGANIZATION.logo.url)).toBe(true);
  });

  it("omits datePublished when the page has none", () => {
    const guide = articleJsonLd({ headline: "h", description: "d", path: "/guides/x", image: "guides", dateModified: "2026-09-27", inLanguage: "ar" });
    expect(guide).not.toHaveProperty("datePublished");
  });

  it("points the logo and article images at real files in /public", () => {
    for (const url of [SITE_ORGANIZATION.logo.url, ...article.image]) {
      expect(existsSync(join(process.cwd(), "public", new URL(url).pathname)), url).toBe(true);
    }
  });
});

describe("lists", () => {
  it("numbers breadcrumb items from 1 with absolute item URLs", () => {
    const crumbs = breadcrumbJsonLd([
      { name: "الرئيسية", path: "/" },
      { name: "مرصد السفر", path: "/insights" },
    ]);
    expect(crumbs.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "مرصد السفر", item: `${SITE_URL}/insights` },
    ]);
  });

  it("gives every ItemList entry an absolute URL", () => {
    const list = itemListJsonLd([{ name: "a", path: "/insights/a" }]);
    expect(list.itemListElement.every(({ url }) => isAbsolute(url))).toBe(true);
  });
});

describe("jsonLdHtml", () => {
  it("cannot be closed early by text inside the data", () => {
    const html = jsonLdHtml({ headline: "</script><script>alert(1)</script>" }).__html;
    expect(html).not.toContain("</script");
    expect(JSON.parse(html)).toEqual({ headline: "</script><script>alert(1)</script>" });
  });
});
