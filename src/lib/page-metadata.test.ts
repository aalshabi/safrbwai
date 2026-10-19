import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OG_IMAGES, OG_SITE_NAME, pageMetadata } from "./page-metadata";
import { metadata as guidesMetadata } from "@/app/guides/page";
import { generateMetadata as guideMetadata } from "@/app/guides/[slug]/page";
import { generateMetadata as insightMetadata } from "@/app/insights/[slug]/page";
import { getReviewedGuides } from "./guides";
import { getPublishedInsights } from "./travel-insights";

describe("pageMetadata", () => {
  it("gives the page its own canonical, Open Graph and Twitter card", () => {
    const meta = pageMetadata({ title: "عنوان", description: "وصف", path: "/guides", image: "guides" });
    expect(meta.alternates).toEqual({ canonical: "/guides" });
    expect(meta.openGraph).toMatchObject({
      type: "website",
      url: "/guides",
      title: "عنوان",
      description: "وصف",
      siteName: OG_SITE_NAME,
      locale: "ar_SA",
      images: [{ url: "/og/guides.png", width: 1200, height: 630, alt: "عنوان" }],
    });
    expect(meta.twitter).toEqual({
      card: "summary_large_image",
      title: "عنوان",
      description: "وصف",
      images: ["/og/guides.png"],
    });
    expect(meta.robots).toBeUndefined();
  });

  it("marks article pages with their dates and keeps robots when given", () => {
    const meta = pageMetadata({
      title: "t",
      description: "d",
      path: "/insights/x",
      image: "insights",
      robots: { index: false, follow: true },
      article: { publishedTime: "2026-10-14", modifiedTime: "2026-10-15" },
    });
    expect(meta.openGraph).toMatchObject({ type: "article", publishedTime: "2026-10-14", modifiedTime: "2026-10-15" });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("points every share image at a real file in /public", () => {
    for (const path of Object.values(OG_IMAGES)) {
      expect(existsSync(join(process.cwd(), "public", path)), path).toBe(true);
    }
  });
});

describe("page metadata wiring", () => {
  it("never lets a content page inherit the homepage's share URL", async () => {
    expect(guidesMetadata.openGraph?.url).toBe("/guides");
    for (const { slug } of getReviewedGuides()) {
      const meta = await guideMetadata({ params: Promise.resolve({ slug }) });
      expect(meta.openGraph?.url).toBe(`/guides/${slug}`);
      expect(meta.alternates?.canonical).toBe(`/guides/${slug}`);
    }
    for (const { slug } of getPublishedInsights()) {
      const meta = await insightMetadata({ params: Promise.resolve({ slug }) });
      expect(meta.openGraph?.url).toBe(`/insights/${slug}`);
      expect(meta.openGraph).toMatchObject({ type: "article" });
    }
  });
});
