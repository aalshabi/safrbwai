"use client";

import Link from "next/link";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import type { GuideStage, TravelGuide } from "@/lib/guides";
import { useLanguage } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";

export function GuideList({ guides }: { guides: readonly TravelGuide[] }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        title: "أدلة سافر بوعي",
        intro: "قوائم قصيرة مبنية على مصادر رسمية، مرتبة حسب مرحلة رحلتك. استخدمها مع محلل العرض قبل الدفع.",
        reviewed: "آخر مراجعة",
        read: "اقرأ الدليل",
        stages: { destination: "قبل اختيار الوجهة", booking: "قبل الحجز", travel: "قبل السفر" } as Record<GuideStage, string>,
      }
    : {
        title: "SafrBwai guides",
        intro: "Short checklists based on official sources, arranged by trip stage. Use them with the offer analyzer before paying.",
        reviewed: "Last reviewed",
        read: "Read guide",
        stages: { destination: "Before choosing a destination", booking: "Before booking", travel: "Before you travel" } as Record<GuideStage, string>,
      };
  const stages: GuideStage[] = ["destination", "booking", "travel"];

  return (
    <div className="mx-auto max-w-3xl">
      <BookOpenCheck className="size-9 text-teal" aria-hidden />
      <h1 className="mt-4 font-display text-3xl font-extrabold md:text-4xl">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.intro}</p>
      {stages.filter((stage) => guides.some((guide) => guide.stage === stage)).map((stage) => (
        <section key={stage} className="mt-10" aria-labelledby={`guides-${stage}`}>
          <h2 id={`guides-${stage}`} className="text-sm font-bold text-teal">{copy.stages[stage]}</h2>
        <div className="mt-4 grid gap-5">
        {guides.filter((guide) => guide.stage === stage).map((guide) => (
          <Card key={guide.slug}>
            <CardContent className="p-6">
              <h3 className="font-display text-xl font-bold"><Link href={`/guides/${guide.slug}`}>{guide.title[locale]}</Link></h3>
              <p className="mt-2 text-sm text-muted-foreground">{guide.description[locale]}</p>
              <p className="mt-3 text-xs text-muted-foreground">{copy.reviewed}: <time dateTime={guide.reviewedAt}>{guide.reviewedAt}</time></p>
              <Link className="mt-4 inline-flex items-center gap-2 font-semibold text-teal" href={`/guides/${guide.slug}`}>
                {copy.read}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
        </section>
      ))}
    </div>
  );
}
