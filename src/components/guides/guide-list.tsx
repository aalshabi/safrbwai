"use client";

import Link from "next/link";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import type { TravelGuide } from "@/lib/guides";
import { useLanguage } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";

export function GuideList({ guides }: { guides: readonly TravelGuide[] }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? { title: "أدلة مراجعة عرض السفر", intro: "قوائم قصيرة مبنية على مصادر رسمية. استخدمها مع محلل العرض قبل الدفع.", reviewed: "آخر مراجعة", read: "اقرأ الدليل" }
    : { title: "Travel offer review guides", intro: "Short checklists based on official sources. Use them with the offer analyzer before paying.", reviewed: "Last reviewed", read: "Read guide" };

  return (
    <div className="mx-auto max-w-3xl">
      <BookOpenCheck className="size-9 text-teal" aria-hidden />
      <h1 className="mt-4 font-display text-3xl font-extrabold md:text-4xl">{copy.title}</h1>
      <p className="mt-3 text-muted-foreground">{copy.intro}</p>
      <div className="mt-10 grid gap-5">
        {guides.map((guide) => (
          <Card key={guide.slug}>
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-bold">{guide.title[locale]}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{guide.description[locale]}</p>
              <p className="mt-3 text-xs text-muted-foreground">{copy.reviewed}: <time dateTime={guide.reviewedAt}>{guide.reviewedAt}</time></p>
              <Link className="mt-4 inline-flex items-center gap-2 font-semibold text-teal" href={`/guides/${guide.slug}`}>
                {copy.read}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
