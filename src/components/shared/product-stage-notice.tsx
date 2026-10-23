"use client";

import Link from "next/link";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { getProductStage } from "@/lib/product/stage";

/**
 * Sits under the analyzer's submit button: the safety notice and the legal
 * links stay visible, the release scope is one tap away, so the input itself
 * starts in the first screen on phones.
 */
export function ProductStageNotice() {
  const { t } = useLanguage();
  const scope = t.analyzeOffer.v2.releaseScope;
  const stage = getProductStage();
  const stageLabel = t.productStage.labels[stage];

  return (
    <section aria-labelledby="product-stage-title" className="space-y-1 border-t border-border pt-4 text-sm">
      {stage === "prelaunch" && (
        <p className="font-semibold leading-6 text-foreground">{t.productStage.prelaunchNotice}</p>
      )}
      <p className="flex items-start gap-2 leading-6 text-foreground">
        <ShieldCheck className="mt-1 size-4 shrink-0 text-teal" aria-hidden />
        <span>{scope.safetyNotice}</span>
      </p>
      <p className="flex flex-wrap gap-x-4">
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-teal underline-offset-4 hover:underline"
          href="/privacy"
        >
          {scope.privacyLink}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center font-semibold text-teal underline-offset-4 hover:underline"
          href="/terms"
        >
          {scope.termsLink}
        </Link>
      </p>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <h2 id="product-stage-title" className="font-display text-sm font-bold text-foreground">
            {scope.title}
          </h2>
          <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
            {stageLabel}
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <p className="pb-1 leading-6 text-muted-foreground">{scope.supportedSources}</p>
      </details>
    </section>
  );
}
