"use client";

import { FileText, FileType2, ImageIcon, LinkIcon, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { TravelOfferInputType } from "@/lib/offer-input/types";
import { isPdfInputAvailable } from "@/lib/offer-input/availability";

const ICONS: Record<TravelOfferInputType, LucideIcon> = {
  text: FileText,
  pdf: FileType2,
  image: ImageIcon,
  url: LinkIcon,
};

export function TravelOfferInputSelector({
  method,
  onSelect,
}: {
  method: TravelOfferInputType;
  onSelect: (next: TravelOfferInputType) => void;
}) {
  const { t } = useLanguage();
  const labels = t.analyzeOffer.v1.methods;
  const unavailableLabel = t.analyzeOffer.v2.unsupportedInputLabel;
  const methods: TravelOfferInputType[] = ["text", "pdf", "image", "url"];
  const pdfAvailable = isPdfInputAvailable();

  return (
    <div
      role="tablist"
      aria-label={t.analyzeOffer.v1.title}
      data-guide-id="offer-source-text"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {methods.map((m) => {
        const Icon = ICONS[m];
        const active = m === method;
        const disabled = !(m === "text" || (m === "pdf" && pdfAvailable));
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onSelect(m)}
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
              active
                ? "border-teal bg-teal/10 text-teal-600"
                : disabled
                  ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-70"
                  : "border-border bg-card text-muted-foreground hover:border-teal/40 hover:text-foreground"
            )}
          >
            <span className="flex min-w-0 items-center justify-center gap-2">
              <Icon className="size-4 shrink-0" aria-hidden />
              <span>{labels[m]}</span>
            </span>
            {disabled && <span className="text-[10px] font-medium">{unavailableLabel}</span>}
          </button>
        );
      })}
    </div>
  );
}
