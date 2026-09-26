"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Tag, Sparkles, AlertCircle, Copy } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import {
  buildOfferInput,
  canSubmit,
  methodHasContent,
  validateText,
  validateUrl,
  type OfferInputValues,
} from "@/lib/offer-input/validation";
import type { OfferErrorCode, TravelOfferInput, TravelOfferInputType } from "@/lib/offer-input/types";
import type { OfferAnalysis } from "@/lib/offer-pipeline/analysis/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { TravelOfferInputSelector } from "@/components/offer-input/travel-offer-input-selector";
import { ProductStageNotice } from "@/components/shared/product-stage-notice";
import { TextOfferInput } from "@/components/offer-input/text-offer-input";
import { FileOfferInput } from "@/components/offer-input/file-offer-input";
import { ImageOfferInput } from "@/components/offer-input/image-offer-input";
import { UrlOfferInput } from "@/components/offer-input/url-offer-input";
import { TravelOfferReview } from "@/components/offer-input/travel-offer-review";
import { OfferAnalysisResult } from "@/components/offer-input/offer-analysis-result";
import { BetaFeedback } from "@/components/offer-input/beta-feedback";
import { isPublicBetaFeedbackEnabled } from "@/lib/feedback/config";
import { copyText } from "@/lib/clipboard/copy-text";
import {
  APPLICATION_RESPONSE_HEADER,
  APPLICATION_RESPONSE_MARKER,
} from "@/lib/offer-pipeline/api/constants";
import { campaignSourceFromSearch } from "@/lib/analytics/events";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type Phase = "input" | "review" | "submitting" | "success" | "error";
type ErrorCode =
  | "badRequest"
  | "tooLarge"
  | "unsupportedMedia"
  | "notAnalyzable"
  | "sourceNotSupported"
  | "rateLimited"
  | "server"
  | "network";

/** UI-side cooldown after a 429, matching the server's rate-limit window. */
const RATE_LIMIT_COOLDOWN_SECONDS = 60;

function applicationErrorRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const response = body as Record<string, unknown>;
  const error = response.error;
  const requestId = response.requestId;

  if (
    response.ok !== false ||
    response.schemaVersion !== "1.0" ||
    !error ||
    typeof error !== "object" ||
    typeof (error as Record<string, unknown>).code !== "string" ||
    typeof requestId !== "string"
  ) {
    return null;
  }

  const normalized = requestId.trim();
  return normalized.length > 0 &&
    normalized.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(normalized)
    ? normalized
    : null;
}

function mapStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return "badRequest";
    case 413:
      return "tooLarge";
    case 415:
      return "unsupportedMedia";
    case 422:
      return "notAnalyzable";
    case 429:
      return "rateLimited";
    case 501:
      return "sourceNotSupported";
    default:
      return "server";
  }
}

export function OfferAnalyzer() {
  const { t, locale } = useLanguage();
  const v1 = t.analyzeOffer.v1;
  const v2 = t.analyzeOffer.v2;
  const feedbackEnabled = isPublicBetaFeedbackEnabled();

  const [phase, setPhase] = React.useState<Phase>("input");
  const [method, setMethod] = React.useState<TravelOfferInputType>("text");
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [pdf, setPdf] = React.useState<File | null>(null);
  const [image, setImage] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState<TravelOfferInputType | null>(null);
  const [submitted, setSubmitted] = React.useState<TravelOfferInput | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<OfferAnalysis | null>(null);
  const [analysisRequestId, setAnalysisRequestId] = React.useState<string | null>(null);
  const [analysisSequence, setAnalysisSequence] = React.useState(0);
  const [feedbackSubmittedIds, setFeedbackSubmittedIds] = React.useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [errorCode, setErrorCode] = React.useState<ErrorCode | null>(null);
  const [errorRequestId, setErrorRequestId] = React.useState<string | null>(null);
  const [requestIdCopyStatus, setRequestIdCopyStatus] = React.useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const [cooldown, setCooldown] = React.useState(0);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const values: OfferInputValues = { text, url, pdf, image };

  React.useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // Rate-limit cooldown countdown (no auto-retry — the user retries manually).
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  function scrollToResult() {
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function clearMethod(m: TravelOfferInputType) {
    if (m === "text") setText("");
    else if (m === "url") setUrl("");
    else if (m === "pdf") setPdf(null);
    else setImage(null);
  }

  function performSwitch(next: TravelOfferInputType) {
    clearMethod(method); // enforce a single active method
    setMethod(next);
    setPending(null);
  }

  function onSelect(next: TravelOfferInputType) {
    if (next === method) return;
    if (methodHasContent(method, values)) setPending(next);
    else performSwitch(next);
  }

  function onStart(e: React.FormEvent) {
    e.preventDefault();
    const input = buildOfferInput(method, values, new Date());
    if (!input) return; // button is disabled when invalid; guard anyway
    if (input.type === "image" && image) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(image));
    }
    setSubmitted(input);
    setPhase("review");
    scrollToResult();
  }

  // Send the confirmed TEXT offer to the real analysis API (same-origin).
  async function analyze() {
    if (phase === "submitting") return; // prevent duplicate submissions
    if (cooldown > 0) return; // blocked during the rate-limit cooldown
    if (!submitted || submitted.type !== "text" || submitted.text === undefined) return;
    setErrorCode(null);
    setErrorRequestId(null);
    setRequestIdCopyStatus("idle");
    setPhase("submitting");
    const analyticsProperties = {
      locale,
      campaignSource:
        typeof window === "undefined" ? undefined : campaignSourceFromSearch(window.location.search),
    };
    trackAnalyticsEvent("offer_analysis_started", analyticsProperties);
    try {
      const res = await fetch("/api/offer/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "text", text: submitted.text }),
      });
      // Rate limited: decide on STATUS only. The 429 may come from an edge WAF
      // before the app, so its body shape is not guaranteed — never read/show it.
      if (res.status === 429) {
        setErrorCode("rateLimited");
        setErrorRequestId(null);
        setCooldown(RATE_LIMIT_COOLDOWN_SECONDS);
        setPhase("error");
        trackAnalyticsEvent("offer_analysis_failed", analyticsProperties);
        return;
      }
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setAnalysis(body.data.analysis as OfferAnalysis);
        setAnalysisRequestId(typeof body.requestId === "string" ? body.requestId : null);
        setErrorRequestId(null);
        setAnalysisSequence((current) => current + 1);
        setPhase("success");
        trackAnalyticsEvent("offer_analysis_completed", analyticsProperties);
        scrollToResult();
      } else {
        setErrorCode(mapStatus(res.status));
        const isApplicationResponse =
          res.headers?.get(APPLICATION_RESPONSE_HEADER) === APPLICATION_RESPONSE_MARKER;
        setErrorRequestId(isApplicationResponse ? applicationErrorRequestId(body) : null);
        setPhase("error");
        trackAnalyticsEvent("offer_analysis_failed", analyticsProperties);
      }
    } catch {
      setErrorCode("network");
      setErrorRequestId(null);
      setPhase("error");
      trackAnalyticsEvent("offer_analysis_failed", analyticsProperties);
    }
  }

  function onEdit() {
    setPhase("input");
  }

  function onNew() {
    clearMethod(method);
    setSubmitted(null);
    setAnalysis(null);
    setAnalysisRequestId(null);
    setErrorCode(null);
    setErrorRequestId(null);
    setRequestIdCopyStatus("idle");
    setPhase("input");
  }

  async function copyErrorRequestId() {
    if (!errorRequestId) return;
    const result = await copyText(errorRequestId);
    setRequestIdCopyStatus(result.copied ? "copied" : "failed");
  }

  const textError: OfferErrorCode | null =
    text.trim().length > 0 && !validateText(text).ok
      ? (validateText(text) as { ok: false; code: OfferErrorCode }).code
      : null;
  const urlError: OfferErrorCode | null =
    url.trim().length > 0 && !validateUrl(url).ok
      ? (validateUrl(url) as { ok: false; code: OfferErrorCode }).code
      : null;

  const submittable = canSubmit(method, values);
  const rateLimited = errorCode === "rateLimited";
  const retryable = errorCode === "server" || errorCode === "network" || (rateLimited && cooldown === 0);
  const errorMessage = errorCode ? v2.errors[errorCode] : "";
  const countdownText = v2.errors.rateLimitedRetryIn.replace("{n}", String(cooldown));

  return (
    <>
      <PageHeader icon={Tag} title={v1.title} subtitle={v1.subtitle} />

      {/* Screen-reader announcements for the async state changes. The full error
          text (incl. the rate-limit message) is announced by the role="alert"
          region below, which is itself an assertive aria-live region. */}
      <div aria-live="polite" className="sr-only">
        {phase === "submitting" ? v2.srSubmitting : phase === "success" ? v2.srSuccess : phase === "error" ? v2.srError : ""}
      </div>

      <div className="container mt-4 pb-20 sm:-mt-4">
        {phase === "input" && (
          <>
            <ProductStageNotice />
            <Card className="mx-auto max-w-2xl shadow-xl">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={onStart} className="space-y-5">
                  <TravelOfferInputSelector method={method} onSelect={onSelect} />

                  <div>
                    {method === "text" && <TextOfferInput value={text} onChange={setText} error={textError} />}
                    {method === "pdf" && <FileOfferInput file={pdf} onFile={setPdf} />}
                    {method === "image" && <ImageOfferInput file={image} onFile={setImage} />}
                    {method === "url" && <UrlOfferInput value={url} onChange={setUrl} error={urlError} />}
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={!submittable}>
                    <Sparkles className="size-4" />
                    {v1.startAnalysis}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        <div ref={resultRef} className="mx-auto mt-8 max-w-2xl scroll-mt-24">
          {(phase === "review" || phase === "submitting") && submitted && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <TravelOfferReview
                input={submitted}
                previewUrl={imagePreview}
                onEdit={onEdit}
                onConfirm={analyze}
                submitting={phase === "submitting"}
              />
              {phase === "submitting" && (
                <p role="status" className="mt-4 text-center text-sm text-muted-foreground">
                  {v2.loading}
                </p>
              )}
            </motion.div>
          )}

          {phase === "success" && analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <OfferAnalysisResult analysis={analysis} />
              {feedbackEnabled && (
                <BetaFeedback
                  key={analysisRequestId ?? analysisSequence}
                  analysisRequestId={analysisRequestId ?? undefined}
                  sourceType="text"
                  alreadySubmitted={
                    analysisRequestId
                      ? feedbackSubmittedIds.has(analysisRequestId)
                      : false
                  }
                  onSubmitted={() => {
                    if (!analysisRequestId) return;
                    setFeedbackSubmittedIds((current) => {
                      const next = new Set(current);
                      next.add(analysisRequestId);
                      return next;
                    });
                  }}
                />
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onEdit}>
                  {v2.actions.edit}
                </Button>
                <Button type="button" onClick={onNew}>
                  {v2.actions.newAnalysis}
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "error" && (
            <Card>
              <CardContent className="p-6 md:p-8">
                <div role="alert" className="space-y-2">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-alarm">
                    <AlertCircle className="size-5 shrink-0" aria-hidden />
                    {v2.errors.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
                {/* Simple countdown — visual only; the message above is announced. */}
                {rateLimited && cooldown > 0 && (
                  <p aria-hidden="true" className="mt-2 text-sm font-medium text-foreground">
                    {countdownText}
                  </p>
                )}
                {errorRequestId && (
                  <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{v2.errors.requestIdLabel}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <code dir="ltr" className="break-all text-sm font-semibold text-foreground">
                        {errorRequestId}
                      </code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={copyErrorRequestId}
                        aria-label={v2.errors.copyRequestId}
                      >
                        <Copy aria-hidden />
                        {v2.errors.copyRequestId}
                      </Button>
                    </div>
                    <p role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">
                      {requestIdCopyStatus === "copied"
                        ? v2.errors.requestIdCopied
                        : requestIdCopyStatus === "failed"
                          ? v2.errors.requestIdCopyFailed
                          : ""}
                    </p>
                  </div>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={onEdit}>
                    {v2.actions.edit}
                  </Button>
                  {retryable && (
                    <Button type="button" variant="outline" onClick={analyze}>
                      {v2.actions.retry}
                    </Button>
                  )}
                  <Button type="button" onClick={onNew}>
                    {v2.actions.newAnalysis}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Switch-confirmation modal */}
      {pending && (
        <SwitchConfirm
          title={v1.switchTitle}
          body={v1.switchBody}
          confirmLabel={v1.switchConfirm}
          cancelLabel={v1.switchCancel}
          onConfirm={() => performSwitch(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}

function SwitchConfirm({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-navy/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="switch-title" className="font-display text-lg font-bold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} type="button" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
