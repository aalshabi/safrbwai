"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard/copy-text";
import { useLanguage } from "@/lib/i18n/provider";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import { formatQuestionsForCopy } from "@/lib/result-actions/format-questions";
import { formatSummaryForCopy } from "@/lib/result-actions/format-summary";
import { campaignSourceFromSearch } from "@/lib/analytics/events";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type ResultCopyKind = "questions" | "summary";

interface ResultCopyActionProps {
  analysis: OfferAnalysis;
  kind: ResultCopyKind;
}

const STATUS_DURATION_MS = 3_500;

export function ResultCopyAction({
  analysis,
  kind,
}: ResultCopyActionProps) {
  const { t, locale, dir } = useLanguage();
  const result = t.analyzeOffer.v2.result;
  const copy = result.copy;
  const [status, setStatus] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const isCopyingRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    },
    []
  );

  const hasQuestions = analysis.suggestedQuestions.length > 0;
  if (kind === "questions" && !hasQuestions) return null;

  const buttonLabel =
    kind === "questions" ? copy.questionsButton : copy.summaryButton;

  function showStatus(message: string) {
    setStatus(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(""), STATUS_DURATION_MS);
  }

  async function handleCopy() {
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;
    setIsCopying(true);
    setStatus("");

    const valueLabels = {
      yes: result.yes,
      no: result.no,
      adults: result.adults,
      children: result.children,
      destinationStated: result.destinationStated,
    };

    const text =
      kind === "questions"
        ? formatQuestionsForCopy(analysis.suggestedQuestions, locale, {
            title: result.questionsTitle,
            reviewedWith: copy.reviewedWith,
          })
        : formatSummaryForCopy(analysis, locale, {
            title: copy.summaryTitle,
            confirmedTitle: result.confirmedTitle,
            missingTitle: result.missingTitle,
            contradictionsTitle: result.contradictionsTitle,
            questionsTitle: result.questionsTitle,
            disclaimer: copy.disclaimer,
            brandLabel: copy.brandLabel,
            value: valueLabels,
          });

    try {
      const copyResult = await copyText(text);
      if (copyResult.copied) {
        trackAnalyticsEvent("offer_analysis_output_copied", {
          locale,
          outputType: kind,
          campaignSource:
            typeof window === "undefined"
              ? undefined
              : campaignSourceFromSearch(window.location.search),
        });
      }
      showStatus(
        copyResult.copied
          ? kind === "questions"
            ? copy.questionsCopied
            : copy.summaryCopied
          : copy.failed
      );
    } finally {
      isCopyingRef.current = false;
      setIsCopying(false);
    }
  }

  return (
    <div dir={dir} className="min-w-0">
      <Button
        type="button"
        data-guide-id={kind === "questions" ? "copy-questions" : "copy-summary"}
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        disabled={isCopying}
        onClick={handleCopy}
      >
        <Copy aria-hidden />
        {buttonLabel}
      </Button>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-1 min-h-5 text-xs text-muted-foreground"
      >
        {status}
      </p>
    </div>
  );
}
