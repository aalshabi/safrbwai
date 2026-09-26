import type { Metadata } from "next";
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
  return {
    title: `${guide.title.ar} — ${guide.title.en}`,
    description: guide.description.ar,
    alternates: { canonical: `/guides/${guide.slug}` },
  };
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
