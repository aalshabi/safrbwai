"use client";

import * as React from "react";
import { Globe, Info, LoaderCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import type { OfferErrorCode } from "@/lib/offer-input/types";
import type { LinkSignal } from "@/lib/offer-input/url/link-check";
import { readUrlOfferText, type UrlTextResult } from "@/lib/offer-input/read-url-offer-text";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/offer-input/field-error";
import { LinkSignals } from "@/components/offer-input/link-signals";

/**
 * Link tab. "Read the page" asks the server to read the public page; its text
 * is handed back for review with the notes about the link. A refusal is shown
 * with those notes, and the link stays for the user to fix or replace.
 */
export function UrlOfferInput({
  value,
  onChange,
  error,
  onExtracted,
  readUrl = (url, signal) => readUrlOfferText(url, { signal }),
}: {
  value: string;
  onChange: (v: string) => void;
  error: OfferErrorCode | null;
  onExtracted?: (text: string, signals: LinkSignal[]) => void;
  readUrl?: (url: string, signal: AbortSignal) => Promise<UrlTextResult>;
}) {
  const { t } = useLanguage();
  const v = t.analyzeOffer.v1.url;
  const errs = t.analyzeOffer.v1.errors;
  const message = error === "url_invalid" ? errs.urlInvalid : error === "empty" ? errs.empty : null;
  const refusals = v.refusals as Record<string, string>;
  const [reading, setReading] = React.useState(false);
  const [refusal, setRefusal] = React.useState<{ reason: string; signals: LinkSignal[] } | null>(null);
  const controller = React.useRef<AbortController | null>(null);

  // Leaving the tab cancels a read in progress.
  React.useEffect(() => () => controller.current?.abort(), []);

  async function read() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setRefusal(null);
    setReading(true);
    const result = await readUrl(value.trim(), current.signal);
    if (current.signal.aborted) return;
    setReading(false);
    if (result.ok) onExtracted?.(result.text, result.signals);
    else setRefusal({ reason: result.reason in refusals ? result.reason : "failed", signals: result.signals });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="offer-url">{v.label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="offer-url"
          type="url"
          inputMode="url"
          dir="ltr"
          value={value}
          onChange={(e) => {
            controller.current?.abort();
            setReading(false);
            setRefusal(null);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            // Enter reads the page rather than submitting the form.
            if (e.key === "Enter") {
              e.preventDefault();
              if (!message && value.trim() && !reading) void read();
            }
          }}
          placeholder={v.placeholder}
          className="ltr-nums"
          aria-invalid={Boolean(message)}
          aria-describedby={message ? "offer-url-error" : "offer-url-note"}
        />
        <Button type="button" variant="outline" onClick={() => void read()} disabled={Boolean(message) || !value.trim() || reading} className="shrink-0">
          <Globe className="size-4" aria-hidden="true" />
          {v.read}
        </Button>
      </div>
      <p id="offer-url-note" className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{v.note}</span>
      </p>
      <FieldError id="offer-url-error" message={message} />
      {/* Always rendered, so screen readers announce the text when it appears. */}
      <p role="status" className={reading ? "flex items-center gap-2 text-sm text-muted-foreground" : "sr-only"}>
        {reading && (
          <>
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {v.reading}
          </>
        )}
      </p>
      {refusal && (
        <>
          <p role="alert" className="text-sm font-medium text-alarm">
            {refusals[refusal.reason]}
          </p>
          <LinkSignals signals={refusal.signals} />
        </>
      )}
    </div>
  );
}
