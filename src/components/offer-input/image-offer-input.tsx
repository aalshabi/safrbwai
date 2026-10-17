"use client";

import { FileOfferInput, type ReadFileText } from "@/components/offer-input/file-offer-input";

/** Image tab: the image's text is read on the device (OCR) and handed back for review. */
export function ImageOfferInput({
  file,
  onFile,
  onExtracted,
  readText,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  onExtracted?: (text: string) => void;
  readText?: ReadFileText;
}) {
  return <FileOfferInput kind="image" file={file} onFile={onFile} onExtracted={onExtracted} readText={readText} />;
}
