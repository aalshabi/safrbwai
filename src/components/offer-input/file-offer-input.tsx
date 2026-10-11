"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Label } from "@/components/ui/label";
import { OfferFileField } from "@/components/offer-input/offer-file-field";
import type { PdfTextRefusal, PdfTextResult } from "@/lib/offer-input/pdf-text";
import { readPdfOfferText } from "@/lib/offer-input/read-pdf-offer-text";

/**
 * PDF tab. When `onExtracted` is given, a chosen file's text is read on the
 * device and handed back for review; a refusal is shown and the file cleared.
 * Nothing is uploaded.
 */
export function FileOfferInput({
  file,
  onFile,
  onExtracted,
  readText = readPdfOfferText,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  onExtracted?: (text: string) => void;
  readText?: (file: File) => Promise<PdfTextResult>;
}) {
  const { t } = useLanguage();
  const v = t.analyzeOffer.v1.pdf;
  const [reading, setReading] = React.useState(false);
  const [refusal, setRefusal] = React.useState<PdfTextRefusal | null>(null);

  React.useEffect(() => {
    if (!file || !onExtracted) return;
    let cancelled = false;
    setRefusal(null);
    setReading(true);
    readText(file).then((result) => {
      if (cancelled) return;
      setReading(false);
      if (result.ok) {
        onExtracted(result.text);
      } else {
        setRefusal(result.reason);
        onFile(null);
      }
    });
    return () => {
      cancelled = true;
    };
    // Re-run only when a different file is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return (
    <div className="space-y-2">
      <Label>{v.label}</Label>
      <OfferFileField kind="pdf" file={file} onFile={(next) => { setRefusal(null); onFile(next); }} />
      {reading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {v.reading}
        </p>
      )}
      {refusal && (
        <p role="alert" className="text-sm font-medium text-alarm">
          {v.refusals[refusal]}
        </p>
      )}
    </div>
  );
}
