"use client";

import { FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { OFFER_LIMITS, type OfferErrorCode } from "@/lib/offer-input/types";
import { cn, formatNumber } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/offer-input/field-error";

export function TextOfferInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error: OfferErrorCode | null;
}) {
  const { t, locale } = useLanguage();
  const v = t.analyzeOffer.v1.text;
  const errs = t.analyzeOffer.v1.errors;
  const len = value.length;
  const over = len > OFFER_LIMITS.textMax;

  const message =
    error === "text_too_short"
      ? errs.textShort
      : error === "text_too_long"
        ? errs.textLong
        : error === "empty"
          ? errs.empty
          : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="offer-text">{v.label}</Label>
        <Button type="button" variant="ghost" size="sm" className="h-11 gap-1.5 text-xs" onClick={() => onChange(v.sample)}>
          <FileText className="size-3.5" />
          {v.loadSample}
        </Button>
      </div>
      <Textarea
        id="offer-text"
        data-guide-id="offer-textarea"
        dir="auto"
        lang={locale}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={v.placeholder}
        className="min-h-[180px]"
        aria-invalid={Boolean(message)}
        aria-describedby={message ? "offer-text-error" : undefined}
        maxLength={OFFER_LIMITS.textMax + 500}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {value === v.sample
            ? v.sampleBadge
            : value.trim().length < OFFER_LIMITS.textMin
              ? v.minHint.replace("{n}", formatNumber(OFFER_LIMITS.textMin, locale))
              : ""}
        </span>
        <span className={cn(over ? "font-semibold text-red-600" : "text-muted-foreground")}>
          <span className="ltr-nums">
            {formatNumber(len, locale)} / {formatNumber(OFFER_LIMITS.textMax, locale)}
          </span>{" "}
          {v.chars}
        </span>
      </div>
      <FieldError id="offer-text-error" message={message} />
    </div>
  );
}
