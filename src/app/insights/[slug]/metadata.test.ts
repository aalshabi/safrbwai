import { describe, expect, it } from "vitest";
import { getPublishedInsights } from "@/lib/travel-insights";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE } from "@/lib/brand/share-image-meta";
import { generateMetadata } from "./page";

describe("share image on article pages", () => {
  // An article's own openGraph replaces the root one, so the card must be
  // named again here or the article is shared without an image.
  it.each(getPublishedInsights().map(({ slug }) => slug))("%s keeps the site share card", async (slug) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.openGraph?.images).toEqual([
      { url: "/opengraph-image", type: "image/png", ...SHARE_IMAGE_SIZE, alt: SHARE_IMAGE_ALT },
    ]);
  });
});
