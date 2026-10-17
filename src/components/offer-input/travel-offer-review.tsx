"use client";

import Image from "next/image";
import { CheckCircle2, Pencil, Send, Loader2, FileText, FileType2, ImageIcon, LinkIcon, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { isExtractionEnabledFor } from "@/lib/offer-pipeline/capabilities";
import { formatNumber } from "@/lib/utils";
import type { TravelOfferInput, TravelOfferInputType } from "@/lib/offer-input/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TYPE_ICON: Record<TravelOfferInputType, LucideIcon> = {
  text: FileText,
  pdf: FileType2,
  image: ImageIcon,
  url: LinkIcon,
};

function formatSize(bytes: number, locale: string) {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(Math.round(bytes / 1024), locale)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[160px_1fr] sm:items-start">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function TravelOfferReview({
  input,
  previewUrl,
  onEdit,
  onConfirm,
  submitting = false,
}: {
  input: TravelOfferInput;
  previewUrl: string | null;
  onEdit: () => void;
  onConfirm?: () => void;
  submitting?: boolean;
}) {
  const { t, locale } = useLanguage();
  const r = t.analyzeOffer.v1.review;
  const v2 = t.analyzeOffer.v2;
  const typeLabels = t.analyzeOffer.v1.typeLabels;
  const Icon = TYPE_ICON[input.type];
  // Only sources the pipeline is designed to process (text) can be submitted.
  const canConfirm = isExtractionEnabledFor(input.type);

  return (
    <div className="space-y-6" data-guide-id="offer-review">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-5 text-teal" />
            {r.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label={r.inputType}>{typeLabels[input.type]}</Row>

          {input.type === "text" && (
            <Row label={r.content}>
              <div
                dir="auto"
                className="max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed"
              >
                {input.text}
              </div>
            </Row>
          )}

          {input.type === "url" && (
            <Row label={r.linkLabel}>
              <span dir="ltr" className="ltr-nums break-all text-teal-700 dark:text-teal-300">
                {input.url}
              </span>
            </Row>
          )}

          {(input.type === "pdf" || input.type === "image") && input.file && (
            <>
              <Row label={r.fileName}>
                <span className="break-all">{input.file.name}</span>
              </Row>
              <Row label={r.fileSize}>
                <span className="ltr-nums">{formatSize(input.file.size, locale)}</span>
              </Row>
              {input.type === "image" && previewUrl && (
                <Row label={r.content}>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Image
                      src={previewUrl}
                      alt={t.analyzeOffer.v1.image.previewAlt ?? ""}
                      width={640}
                      height={360}
                      className="max-h-64 w-full object-contain"
                      unoptimized
                    />
                  </div>
                </Row>
              )}
            </>
          )}

          <Row label={r.inputTime}>
            <span className="ltr-nums">
              {new Date(input.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
            </span>
          </Row>

          <Row label={r.statusLabel}>
            <span className="inline-flex items-start gap-2 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-teal-700 dark:text-teal-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              {r.statusText}
            </span>
          </Row>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onEdit} disabled={submitting}>
          <Pencil className="size-4" />
          {r.editInput}
        </Button>
        {/* Only text is enabled; pdf/image/url remain "coming soon". */}
        <span title={canConfirm ? undefined : v2.comingSoon}>
          <Button
            type="button"
            data-guide-id="offer-submit"
            onClick={onConfirm}
            disabled={!canConfirm || submitting}
            aria-disabled={!canConfirm || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" />}
            {r.confirmSend}
          </Button>
        </span>
      </div>
      {!canConfirm && <p className="text-center text-xs text-muted-foreground">{v2.comingSoon}</p>}
    </div>
  );
}
