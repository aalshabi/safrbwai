"use client";

import Link from "next/link";
import { BarChart3, BookOpenCheck, Building2, Compass, LayoutDashboard, Sparkles, Tag } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import {
  getNavigableCapabilities,
  type ProductCapabilityKey,
} from "@/lib/product/capabilities";

const FEATURE_ICONS: Partial<Record<ProductCapabilityKey, typeof Building2>> = {
  hotelOfferReview: Building2,
  destinationChecklist: Compass,
  textOfferAnalysis: Tag,
  travelGuides: BookOpenCheck,
  hotelComparison: BarChart3,
  knowledgeLibrary: Sparkles,
  localDashboard: LayoutDashboard,
};

export function Features() {
  const { locale, t } = useLanguage();
  const features = getNavigableCapabilities().map((capability) => ({
    ...capability,
    icon: FEATURE_ICONS[capability.key] ?? Tag,
  }));

  return (
    <section className="section">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">
            {t.features.title}
          </h2>
          <p className="mt-4 text-muted-foreground">{t.features.subtitle}</p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.key} index={i}>
              <Link href={f.route} className="group block h-full">
                <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-teal/40 hover:shadow-xl hover:shadow-teal/5">
                  <CardContent className="p-7">
                    <div className="mb-5 grid size-12 place-items-center rounded-xl bg-teal/10 text-teal transition-colors group-hover:bg-teal group-hover:text-white">
                      <f.icon className="size-6" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {f.title[locale]}
                      </h3>
                      <span
                        className={
                          f.status === "enabled"
                            ? "rounded-full bg-teal/10 px-2 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300"
                            : "rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
                        }
                      >
                        {t.productStage.status[f.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {f.reason[locale]}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
