import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { INSIGHT_SEO } from "@/lib/seo-copy";
import { notFound } from "next/navigation";
import { InsightArticle } from "@/components/insights/insight-article";
import { getInsight, getPublishedInsights } from "@/lib/travel-insights";
import { SITE_URL } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPublishedInsights().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const insight = getInsight((await params).slug);
  if (!insight || insight.status !== "published") return {};
  const seo = INSIGHT_SEO[insight.slug];
  return pageMetadata({
    title: seo?.title ?? insight.title.ar,
    description: seo?.description ?? insight.description.ar,
    path: `/insights/${insight.slug}`,
    image: "insights",
    article: { publishedTime: insight.publishedAt, modifiedTime: insight.reviewedAt },
  });
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
