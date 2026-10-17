"use client";

import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Info, ShieldCheck } from "lucide-react";
import type { InsightClaimType, TravelInsight } from "@/lib/travel-insights";
import { useLanguage } from "@/lib/i18n/provider";

const CLAIM_STYLES: Record<InsightClaimType, string> = {
  fact: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  reported: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  inference: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  recommendation: "bg-teal/10 text-teal-700 dark:text-teal-300",
};

export function InsightArticle({ insight }: { insight: TravelInsight }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        back: "العودة إلى المرصد",
        checked: "آخر تحقق",
        sourceTitle: "المصادر",
        sourceNote: "المصادر الإعلامية تساعد في اكتشاف الإشارة. تحقّق من الجهة الرسمية أو مقدم الخدمة قبل الاعتماد على سعر أو توافر أو متطلب متغير.",
        claims: { fact: "حقيقة موثقة", reported: "معلومة منقولة", inference: "استنتاج", recommendation: "توصية عملية" },
      }
    : {
        back: "Back to the monitor",
        checked: "Last checked",
        sourceTitle: "Sources",
        sourceNote: "Media sources help identify a signal. Check the official authority or provider before relying on a changing price, availability, or requirement.",
        claims: { fact: "Verified fact", reported: "Reported information", inference: "Inference", recommendation: "Practical recommendation" },
      };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/insights" className="inline-flex items-center gap-2 text-sm font-bold text-teal">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
        {copy.back}
      </Link>

      <header className="mt-8 border-b border-border pb-9">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-teal/10 px-3 py-1 font-bold text-teal-700 dark:text-teal-300">
            {insight.category[locale]}
          </span>
          <span className="text-muted-foreground">
            {copy.checked}: <time dateTime={insight.reviewedAt}>{insight.reviewedAt}</time>
          </span>
        </div>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight md:text-5xl">
          {insight.title[locale]}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{insight.description[locale]}</p>
      </header>

      <div className="mt-10 space-y-12">
        {insight.sections.map((section) => (
          <section key={section.heading.en}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold">{section.heading[locale]}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${CLAIM_STYLES[section.claimType]}`}>
                {copy.claims[section.claimType]}
              </span>
            </div>
            <p className="mt-4 leading-8 text-muted-foreground">{section.body[locale]}</p>
            {section.checks.length > 0 && (
              <ul className="mt-6 space-y-3">
                {section.checks.map((check) => (
                  <li key={check.en} className="flex gap-3 rounded-xl border border-border bg-card p-4 leading-7">
                    <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    <span>{check[locale]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <ShieldCheck className="size-6 text-teal" aria-hidden />
          {copy.sourceTitle}
        </h2>
        <ul className="mt-5 space-y-4">
          {insight.sources.map((source) => (
            <li key={source.href} className="rounded-xl bg-background p-4">
              <a
                className="inline-flex items-start gap-2 font-bold text-teal underline decoration-teal/30 underline-offset-4 hover:decoration-teal"
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{source.label[locale]} — {source.publisher}</span>
                <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden />
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                <time dateTime={source.publishedAt}>{source.publishedAt}</time>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex gap-2 text-sm leading-7 text-muted-foreground">
          <Info className="mt-1 size-4 shrink-0" aria-hidden />
          {copy.sourceNote}
        </p>
      </section>
    </div>
  );
}
