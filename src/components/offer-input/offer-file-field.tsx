"use client";

import * as React from "react";
import Image from "next/image";
import { UploadCloud, FileText, ImageIcon, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { validateFile, type FileKind } from "@/lib/offer-input/validation";
import type { OfferErrorCode } from "@/lib/offer-input/types";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/offer-input/field-error";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Drag-and-drop file field shared by the PDF and image tabs. Validation
 * (MIME + size) happens client-side on drop/select; unsupported/oversized
 * files are rejected with a clear Arabic message and are NOT stored. Nothing
 * is uploaded anywhere. Image files get a local preview via createObjectURL.
 */
export function OfferFileField({
  kind,
  file,
  onFile,
}: {
  kind: FileKind;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const { t, locale } = useLanguage();
  const v = kind === "pdf" ? t.analyzeOffer.v1.pdf : t.analyzeOffer.v1.image;
  const errs = t.analyzeOffer.v1.errors;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<OfferErrorCode | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (file && kind === "image") {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file, kind]);

  function messageFor(code: OfferErrorCode): string {
    if (code === "file_too_large") return errs.fileLarge;
    if (code === "file_unsupported") return kind === "pdf" ? errs.fileTypePdf : errs.fileTypeImage;
    return errs.empty;
  }

  function accept(f: File | undefined) {
    if (!f) return;
    const result = validateFile(f, kind);
    if (result.ok) {
      setError(null);
      onFile(f);
    } else {
      setError(result.code);
    }
  }

  const acceptAttr = kind === "pdf" ? ".pdf,application/pdf" : ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

  if (file) {
    return (
      <div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-teal/10 text-teal">
            {kind === "image" && preview ? (
              <Image src={preview} alt={t.analyzeOffer.v1.image.previewAlt} width={56} height={56} className="size-14 object-cover" unoptimized />
            ) : kind === "image" ? (
              <ImageIcon className="size-6" />
            ) : (
              <FileText className="size-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {v.selected} · <span className="ltr-nums">{formatSize(file.size)}</span>
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onFile(null)} aria-label={v.remove}>
            <X className="size-4" />
          </Button>
        </div>
        {kind === "image" && preview && (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <Image
              src={preview}
              alt={t.analyzeOffer.v1.image.previewAlt}
              width={640}
              height={360}
              className="max-h-72 w-full object-contain"
              unoptimized
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={v.dropTitle}
        lang={locale}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
          dragging ? "border-teal bg-teal/5" : "border-border hover:border-teal/50 hover:bg-muted/40"
        )}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-teal/10 text-teal">
          <UploadCloud className="size-7" />
        </div>
        <div>
          <p className="font-display text-base font-bold text-foreground">{v.dropTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{v.dropHint}</p>
        </div>
        <Button type="button" variant="outline" size="sm" tabIndex={-1}>
          {v.browse}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>
      <FieldError message={error ? messageFor(error) : null} />
    </div>
  );
}
