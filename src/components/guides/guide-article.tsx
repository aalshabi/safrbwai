"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { TravelGuide } from "@/lib/guides";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";

export function GuideArticle({ guide }: { guide: TravelGuide }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? { eyebrow: "دليل عملي لمراجعة العرض", reviewed: "آخر مراجعة للمصادر", sources: "المصادر", change: "قد تتغير المتطلبات والسياسات. راجع المصدر الرسمي ومقدم الخدمة قبل الحجز.", ctaTitle: "طبّق القائمة على عرضك", ctaBody: "ألصق نص العرض وسيحدد المحلل المعلومات المذكورة والأسئلة التي تحتاج طرحها.", cta: "حلّل العرض الآن" }
    : { eyebrow: "Practical offer review guide", reviewed: "Sources last reviewed", sources: "Sources", change: "Requirements and policies can change. Check the official source and provider before booking.", ctaTitle: "Apply the checklist to your offer", ctaBody: "Paste the offer text to identify stated information and questions you should ask.", cta: "Analyze the offer" };

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-teal">{copy.eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">{guide.title[locale]}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{guide.description[locale]}</p>
      <p className="mt-3 text-sm text-muted-foreground">{copy.reviewed}: <time dateTime={guide.reviewedAt}>{guide.reviewedAt}</time></p>
      <div className="mt-10 space-y-9">
        {guide.sections.map((section) => (
          <section key={section.heading.en}>
            <h2 className="font-display text-2xl font-bold">{section.heading[locale]}</h2>
            <p className="mt-3 leading-8 text-muted-foreground">{section.body[locale]}</p>
            {section.checks.length > 0 && <ul className="mt-4 space-y-3">{section.checks.map((check) => <li className="rounded-xl border border-border p-4" key={check.en}>{check[locale]}</li>)}</ul>}
          </section>
        ))}
      </div>
      <section className="mt-12 rounded-2xl border border-border bg-muted/30 p-6">
        <h2 className="font-display text-xl font-bold">{copy.sources}</h2>
        <ul className="mt-4 space-y-3">{guide.sources.map((source) => <li key={source.href}><a className="inline-flex items-center gap-2 text-teal underline underline-offset-4" href={source.href} target="_blank" rel="noopener noreferrer">{source.label[locale]}<ExternalLink className="size-4" aria-hidden /></a></li>)}</ul>
        <p className="mt-4 text-sm text-muted-foreground">{copy.change}</p>
      </section>
      <div className="mt-10 rounded-2xl bg-navy p-7 text-white">
        <h2 className="font-display text-2xl font-bold">{copy.ctaTitle}</h2>
        <p className="mt-2 text-white/70">{copy.ctaBody}</p>
        <Button asChild className="mt-5"><Link href="/analyze-offer">{copy.cta}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden /></Link></Button>
      </div>
    </div>
  );
}
