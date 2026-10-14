"use client";

import { Radar } from "lucide-react";
import type { TravelInsight } from "@/lib/travel-insights";
import { useLanguage } from "@/lib/i18n/provider";
import { InsightCard } from "@/components/insights/insight-card";

export function InsightList({ insights }: { insights: readonly TravelInsight[] }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        eyebrow: "مرصد السفر العالمي",
        title: "مواضيع تساعدك على السفر بوعي",
        intro: "نرصد المجلات والمنصات المتخصصة، ثم نراجع أقوى الإشارات ونحوّلها إلى خطوات واضحة للمسافر. كل موضوع يبيّن نوع المعلومة ومصادرها وتاريخ التحقق.",
      }
    : {
        eyebrow: "Global Travel Monitor",
        title: "Stories for more conscious travel",
        intro: "We monitor specialist travel publications, review the strongest signals, and turn them into clear actions. Each story shows its evidence type, sources, and review date.",
      };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-teal">
          <Radar className="size-4" aria-hidden />
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{copy.intro}</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {insights.map((insight, index) => (
          <InsightCard key={insight.slug} insight={insight} index={index} />
        ))}
      </div>
    </div>
  );
}
