"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { getProductStage } from "@/lib/product/stage";

export function ProductStageNotice() {
  const { t } = useLanguage();
  const scope = t.analyzeOffer.v2.releaseScope;
  const stage = getProductStage();
  const stageLabel = t.productStage.labels[stage];

  return (
    <section
      aria-labelledby="product-stage-title"
      className="mx-auto mb-4 max-w-2xl rounded-2xl border border-teal/25 bg-teal/5 p-5 shadow-sm md:p-6"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="product-stage-title"
              className="font-display text-base font-bold text-foreground"
            >
              {scope.title}
            </h2>
            <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              {stageLabel}
            </span>
          </div>
          {stage === "prelaunch" && (
            <p className="text-sm font-semibold leading-6 text-foreground">
              {t.productStage.prelaunchNotice}
            </p>
          )}
          <p className="text-sm leading-6 text-muted-foreground">{scope.supportedSources}</p>
          <p className="text-sm leading-6 text-foreground">{scope.safetyNotice}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <Link
              className="font-semibold text-teal underline-offset-4 hover:underline"
              href="/privacy"
            >
              {scope.privacyLink}
            </Link>
            <Link className="font-semibold text-teal underline-offset-4 hover:underline" href="/terms">
              {scope.termsLink}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
