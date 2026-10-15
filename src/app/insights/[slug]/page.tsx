import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InsightArticle } from "@/components/insights/insight-article";
import { getInsight, getPublishedInsights } from "@/lib/travel-insights";
import { SITE_URL } from "@/lib/site-url";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE } from "@/lib/brand/share-image-meta";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedInsights().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const insight = getInsight((await params).slug);
  if (!insight || insight.status !== "published") return {};
  return {
    title: `${insight.title.ar} — ${insight.title.en}`,
    description: insight.description.ar,
    alternates: { canonical: `/insights/${insight.slug}` },
    openGraph: {
      type: "article",
      title: insight.title.ar,
      description: insight.description.ar,
      publishedTime: insight.publishedAt,
      modifiedTime: insight.reviewedAt,
      url: `${SITE_URL}/insights/${insight.slug}`,
      // A page's own openGraph replaces the root one whole, so the site share
      // card has to be named again or the article is shared without an image.
      images: [{ url: "/opengraph-image", type: "image/png", ...SHARE_IMAGE_SIZE, alt: SHARE_IMAGE_ALT }],
    },
  };
}

export default async function InsightPage({ params }: Props) {
  const insight = getInsight((await params).slug);
  if (!insight || insight.status !== "published") notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title.ar,
    description: insight.description.ar,
    datePublished: insight.publishedAt,
    dateModified: insight.reviewedAt,
    inLanguage: ["ar", "en"],
    mainEntityOfPage: `${SITE_URL}/insights/${insight.slug}`,
    publisher: { "@type": "Organization", name: "سافر بوعي — SafrBwai" },
  };

  return (
    <article className="container py-14 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <InsightArticle insight={insight} />
    </article>
  );
}
