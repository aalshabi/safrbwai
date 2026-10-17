"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Label } from "@/components/ui/label";
import { OfferFileField } from "@/components/offer-input/offer-file-field";
import { readPdfOfferText } from "@/lib/offer-input/read-pdf-offer-text";
import { readImageOfferText, type ImageReadProgress } from "@/lib/offer-input/read-image-offer-text";

export type FileTextResult = { ok: true; text: string } | { ok: false; reason: string };
export type ReadFileText = (
  file: File,
  onProgress?: (progress: ImageReadProgress) => void,
  signal?: AbortSignal
) => Promise<FileTextResult>;

const DEFAULT_READERS: Record<"pdf" | "image", ReadFileText> = {
  pdf: (file, _onProgress, signal) => readPdfOfferText(file, undefined, signal),
  image: (file, onProgress, signal) => readImageOfferText(file, { onProgress, signal }),
};

/**
 * PDF and image tabs. When `onExtracted` is given, a chosen file's text is read
 * on the device (PDF text layer, or OCR for an image) and handed back for
 * review; a refusal is shown and the file cleared. Nothing is uploaded.
 */
export function FileOfferInput({
  kind = "pdf",
  file,
  onFile,
  onExtracted,
  readText,
}: {
  kind?: "pdf" | "image";
  file: File | null;
  onFile: (file: File | null) => void;
  onExtracted?: (text: string) => void;
  readText?: ReadFileText;
}) {
  const { t } = useLanguage();
  const v = kind === "pdf" ? t.analyzeOffer.v1.pdf : t.analyzeOffer.v1.image;
  const refusals = v.refusals as Record<string, string>;
  const [reading, setReading] = React.useState(false);
  const [progress, setProgress] = React.useState<ImageReadProgress | null>(null);
  // Once recognition has started, later engine stages (the second, Arabic-only
  // pass) keep the "reading" label instead of going back to "preparing".
  const [recognizing, setRecognizing] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProgress(null);
    setRecognizing(false);
    if (!file || !onExtracted) {
      setReading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setRefusal(null);
    setReading(true);
    (readText ?? DEFAULT_READERS[kind])(
      file,
      (p) => {
        if (cancelled) return;
        setProgress(p);
        if (p.stage === "recognizing") setRecognizing(true);
      },
      controller.signal
    ).then((result) => {
      if (cancelled) return;
      setReading(false);
      if (result.ok) {
        onExtracted(result.text);
      } else {
        setRefusal(result.reason in refusals ? result.reason : "failed");
        onFile(null);
      }
    });
    return () => {
      cancelled = true;
      // A removed or replaced file, or a tab switch, stops the read.
      controller.abort();
    };
    // Re-run only when a different file is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // The percentage is shown only while the engine and models first load (the
  // slow part on a first visit); it is visual only, so screen readers hear the
  // stage once rather than every progress tick.
  const preparing = kind === "image" && !recognizing && progress?.stage === "loading";
  const readingLabel = preparing ? t.analyzeOffer.v1.image.loadingModels : v.reading;
  const percent = preparing && progress ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100) : null;

  return (
    <div className="space-y-2">
      <Label>{v.label}</Label>
      <OfferFileField kind={kind} file={file} onFile={(next) => { setRefusal(null); onFile(next); }} />
      {reading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <span>{readingLabel}</span>
          {percent !== null && (
            <bdi dir="ltr" aria-hidden="true">
              {percent}%
            </bdi>
          )}
        </p>
      )}
      {refusal && (
        <p role="alert" className="text-sm font-medium text-alarm">
          {refusals[refusal]}
        </p>
      )}
    </div>
  );
}
