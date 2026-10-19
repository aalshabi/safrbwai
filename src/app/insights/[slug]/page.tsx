import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { INSIGHT_SEO } from "@/lib/seo-copy";
import { notFound } from "next/navigation";
import { InsightArticle } from "@/components/insights/insight-article";
import { getInsight, getPublishedInsights } from "@/lib/travel-insights";
import { RelatedLinks } from "@/components/content/related-links";
import { getRelatedLinks } from "@/lib/related-content";
import { articleJsonLd, breadcrumbJsonLd, jsonLdHtml, SECTION_NAMES } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

/** Only the prerendered slugs exist; any other path is a real 404, not a 200 "not found" page. */
export const dynamicParams = false;

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

  const path = `/insights/${insight.slug}`;
  const jsonLd = [
    articleJsonLd({
      headline: insight.title.ar,
      description: insight.description.ar,
      path,
      image: "insights",
      datePublished: insight.publishedAt,
      dateModified: insight.reviewedAt,
      inLanguage: ["ar", "en"],
    }),
    breadcrumbJsonLd([
      { name: SECTION_NAMES.home, path: "/" },
      { name: SECTION_NAMES.insights, path: "/insights" },
      { name: insight.title.ar, path },
    ]),
  ];

  return (
    <article className="container py-14 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <InsightArticle insight={insight} />
      <RelatedLinks links={getRelatedLinks({ kind: "insight", slug: insight.slug })} />
    </article>
  );
}
