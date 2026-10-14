"use client";

import Link from "next/link";
import { ArrowLeft, Bot, Hotel, ShieldCheck } from "lucide-react";
import type { TravelInsight } from "@/lib/travel-insights";
import { useLanguage } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";

const ICONS = [ShieldCheck, Hotel, Bot] as const;

export function InsightCard({ insight, index }: { insight: TravelInsight; index: number }) {
  const { locale } = useLanguage();
  const Icon = ICONS[index % ICONS.length];
  const copy = locale === "ar"
    ? { read: "اقرأ الموضوع", checked: "آخر تحقق" }
    : { read: "Read the story", checked: "Last checked" };

  return (
    <Card className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-teal/40 hover:shadow-xl hover:shadow-teal/5">
      <CardContent className="flex h-full flex-col p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-to-bl from-teal/12 via-teal/5 to-transparent p-6">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal text-white shadow-lg shadow-teal/20">
            <Icon className="size-6" aria-hidden />
          </div>
          <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-bold text-teal backdrop-blur">
            {insight.category[locale]}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <h3 className="font-display text-xl font-extrabold leading-snug text-foreground">
            {insight.title[locale]}
          </h3>
          <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
            {insight.description[locale]}
          </p>
          <p className="mt-5 text-xs text-muted-foreground">
            {copy.checked}: <time dateTime={insight.reviewedAt}>{insight.reviewedAt}</time>
          </p>
          <Link
            href={`/insights/${insight.slug}`}
            className="mt-4 inline-flex items-center gap-2 font-bold text-teal"
          >
            {copy.read}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
