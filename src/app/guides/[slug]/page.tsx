import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { GUIDE_SEO } from "@/lib/seo-copy";
import { notFound } from "next/navigation";
import { getGuide, getReviewedGuides } from "@/lib/guides";
import { GuideArticle } from "@/components/guides/guide-article";

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

  return (
    <article className="container py-14 md:py-20">
      <GuideArticle guide={guide} />
    </article>
  );
}
