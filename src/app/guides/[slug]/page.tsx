import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { GUIDE_SEO } from "@/lib/seo-copy";
import { notFound } from "next/navigation";
import { getGuide, getReviewedGuides } from "@/lib/guides";
import { GuideArticle } from "@/components/guides/guide-article";
import { articleJsonLd, breadcrumbJsonLd, jsonLdHtml, SECTION_NAMES } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getReviewedGuides().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide || guide.status !== "reviewed") return {};
  const seo = GUIDE_SEO[guide.slug];
  return pageMetadata({
    title: seo?.title ?? guide.title.ar,
    description: seo?.description ?? guide.description.ar,
    path: `/guides/${guide.slug}`,
    image: "guides",
  });
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide((await params).slug);
  if (!guide || guide.status !== "reviewed") notFound();

  const path = `/guides/${guide.slug}`;
  // Guides record only a review date, so no datePublished is claimed.
  const jsonLd = [
    articleJsonLd({
      headline: guide.title.ar,
      description: guide.description.ar,
      path,
      image: "guides",
      dateModified: guide.reviewedAt,
      inLanguage: ["ar", "en"],
    }),
    breadcrumbJsonLd([
      { name: SECTION_NAMES.home, path: "/" },
      { name: SECTION_NAMES.guides, path: "/guides" },
      { name: guide.title.ar, path },
    ]),
  ];

  return (
    <article className="container py-14 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <GuideArticle guide={guide} />
    </article>
  );
}
