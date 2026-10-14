import type { Metadata } from "next";
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
