"use client";

import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";
import type { TravelInsight } from "@/lib/travel-insights";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { InsightCard } from "@/components/insights/insight-card";

export function LatestInsights({ insights }: { insights: readonly TravelInsight[] }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        eyebrow: "من مرصد السفر العالمي",
        title: "ثلاثة مواضيع تستحق انتباهك الآن",
        subtitle: "نحوّل إشارات السفر العالمية إلى معرفة عملية تساعدك على الاختيار والتحقق قبل الحجز.",
        all: "عرض جميع المواضيع",
      }
    : {
        eyebrow: "From the Global Travel Monitor",
        title: "Three travel stories worth your attention",
        subtitle: "We turn global travel signals into practical knowledge for choosing and checking before you book.",
        all: "View all stories",
      };

  return (
    <section className="section bg-muted/30" aria-labelledby="latest-insights-title">
      <div className="container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-teal">
            <Radar className="size-4" aria-hidden />
            {copy.eyebrow}
          </p>
          <h2 id="latest-insights-title" className="mt-3 font-display text-3xl font-extrabold md:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">{copy.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <Reveal key={insight.slug} index={index}>
              <InsightCard insight={insight} index={index} />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/insights">
              {copy.all}
              <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
