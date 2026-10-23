"use client";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ListChecks,
  ClipboardCheck,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import type { Bi } from "@/lib/offer-pipeline/types";
import { formatNumber } from "@/lib/utils";
import type {
  ChecklistItem,
  ChecklistStatus,
  Contradiction,
  FieldRequirement,
  OfferAnalysis,
} from "@/lib/offer-pipeline/analysis/types";
import { Card, CardContent } from "@/components/ui/card";
import { ResultCopyAction } from "./result-actions";
import {
  formatResultValue,
  localizeBi,
} from "@/lib/result-actions/format-result-value";

function Section({
  id,
  guideId,
  icon: Icon,
  title,
  action,
  children,
}: {
  id: string;
  guideId?: string;
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} data-guide-id={guideId}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h3
          id={id}
          className="flex items-center gap-2 font-display text-base font-bold text-foreground"
        >
          <Icon className="size-4 text-teal" aria-hidden />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A secondary section that starts collapsed. The decision-critical parts of the
 * report (completeness, questions, contradictions) stay open; the exhaustive
 * per-field detail is one click away instead of a wall of text.
 */
function FoldableSection({
  guideId,
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  guideId?: string;
  icon: LucideIcon;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details data-guide-id={guideId} open={defaultOpen} className="group rounded-xl border border-border">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 py-3 font-display text-base font-bold text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Icon className="size-4 shrink-0 text-teal" aria-hidden />
        <span>{title}</span>
        {count !== undefined && <span className="ltr-nums text-xs font-normal text-muted-foreground">({count})</span>}
        <ChevronDown className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}

const CHECK_STATUS: Record<ChecklistStatus, { icon: LucideIcon; className: string }> = {
  present: { icon: CheckCircle2, className: "text-teal-700 dark:text-teal-300" },
  missing: { icon: XCircle, className: "text-muted-foreground" },
  conflicting: { icon: AlertTriangle, className: "text-amber-700 dark:text-amber-400" },
};

/** Facts only a travel offer states; with none of them the text is probably something else. */
const OFFER_SIGNALS = new Set([
  "destination", "nights", "travelDates", "accommodation", "flight",
  "totalPrice", "perPersonPrice", "perNightPrice", "statedPrice",
  "transitDuration", "stopCount", "airportChange",
]);
/** Facts other texts state too ("breakfast is not included in this recipe"): two of them are needed. */
const WEAK_OFFER_SIGNALS = new Set([
  "travellers", "board", "baggage", "transfers", "visa", "insurance", "taxes", "cancellationPolicy", "roomType",
]);

export function looksLikeTravelOffer(analysis: OfferAnalysis): boolean {
  const keys = analysis.confirmedFacts.map(({ key }) => key);
  return keys.some((key) => OFFER_SIGNALS.has(key)) || new Set(keys.filter((key) => WEAK_OFFER_SIGNALS.has(key))).size >= 2;
}

export function OfferAnalysisResult({ analysis }: { analysis: OfferAnalysis }) {
  const { t, locale } = useLanguage();
  const r = t.analyzeOffer.v2.result;
  const valueLabels = { yes: r.yes, no: r.no, adults: r.adults, children: r.children, destinationStated: r.destinationStated };

  const labelByKey = new Map<string, Bi>();
  for (const f of analysis.confirmedFacts) labelByKey.set(f.key, f.label);
  for (const m of analysis.missingFields) labelByKey.set(m.key, m.label);
  for (const c of analysis.checklist) labelByKey.set(c.key, c.label);

  const requirementLabel: Record<FieldRequirement, string> = {
    required: r.reqRequired,
    recommended: r.reqRecommended,
    "context-dependent": r.reqContext,
  };
  const statusLabel: Record<ChecklistStatus, string> = {
    present: r.statusPresent,
    missing: r.statusMissing,
    conflicting: r.statusConflicting,
  };

  return (
    <Card>
      <CardContent className="space-y-8 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {r.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>
          </div>
          <ResultCopyAction analysis={analysis} kind="summary" />
        </div>

        {!looksLikeTravelOffer(analysis) && (
          <p role="status" className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm font-medium text-foreground">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            {r.notAnOffer}
          </p>
        )}

        {/* Completeness — present / required with the counted fields */}
        <Section id="oa-completeness" icon={ClipboardCheck} title={r.completenessTitle}>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="font-display text-xl font-bold text-foreground">
              <span className="ltr-nums">{formatNumber(analysis.completeness.present, locale)}</span> {r.completenessOf}{" "}
              <span className="ltr-nums">{formatNumber(analysis.completeness.required, locale)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.completenessCaption}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {/* Missing fields first: they are what the traveller needs to ask about. */}
              {[...analysis.completeness.fields].sort((a, b) => Number(a.present) - Number(b.present)).map((f) => {
                const label = labelByKey.get(f.key);
                const Icon = f.present ? CheckCircle2 : XCircle;
                return (
                  <li
                    key={f.key}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      f.present
                        ? "border-teal/30 bg-teal/5 text-teal-700 dark:text-teal-300"
                        : "border-amber-500/50 bg-amber-500/10 font-semibold text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {label ? localizeBi(label, locale) : f.key}
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>

        {/* Suggested questions — the most actionable output, kept near the top. */}
        {analysis.suggestedQuestions.length > 0 && (
          <Section
            id="oa-questions"
            guideId="result-questions"
            icon={HelpCircle}
            title={r.questionsTitle}
            action={
              <ResultCopyAction analysis={analysis} kind="questions" />
            }
          >
            <ol className="space-y-2">
              {analysis.suggestedQuestions.map((q) => (
                <li key={q.key} className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-sm text-foreground">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                  <span>{localizeBi(q.question, locale)}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Missing fields — open by default, ahead of the confirmed detail */}
        <FoldableSection guideId="result-missing" icon={XCircle} title={r.missingTitle} count={analysis.missingFields.length} defaultOpen={analysis.missingFields.length > 0}>
          {analysis.missingFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">{r.missingEmpty}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {analysis.missingFields.map((m) => (
                <li key={m.key} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-foreground">
                  {localizeBi(m.label, locale)}
                  <span className="text-muted-foreground">· {requirementLabel[m.requirement]}</span>
                </li>
              ))}
            </ul>
          )}
        </FoldableSection>

        {/* Confirmed facts (secondary detail — collapsed) */}
        <FoldableSection guideId="result-confirmed" icon={ClipboardCheck} title={r.confirmedTitle} count={analysis.confirmedFacts.length}>
          {analysis.confirmedFacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{r.confirmedEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {analysis.confirmedFacts.map((f) => (
                <li key={f.key} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{localizeBi(f.label, locale)}</span>
                    <span dir="auto" className="text-sm text-teal-700 dark:text-teal-300">
                      {formatResultValue(f.value, locale, valueLabels)}
                    </span>
                  </div>
                  <p dir="auto" className="mt-1.5 text-xs text-muted-foreground">
                    <span className="font-medium">{r.evidenceLabel}: </span>
                    <span className="italic">“{f.evidence}”</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </FoldableSection>

        {/* Checklist (secondary detail — collapsed) */}
        <FoldableSection icon={ListChecks} title={r.checklistTitle} count={analysis.checklist.length}>
          <ul className="space-y-2">
            {analysis.checklist.map((item: ChecklistItem) => {
              const s = CHECK_STATUS[item.status];
              const Icon = s.icon;
              return (
                <li key={item.key} className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${s.className}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      {localizeBi(item.label, locale)}
                      <span className={`ms-2 text-xs ${s.className}`}>({statusLabel[item.status]})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{localizeBi(item.explanation, locale)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </FoldableSection>

        {/* Contradictions */}
        <Section id="oa-contradictions" guideId="result-contradictions" icon={AlertTriangle} title={r.contradictionsTitle}>
          {analysis.contradictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{r.contradictionsEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {analysis.contradictions.map((c: Contradiction) => (
                <li
                  key={c.code}
                  className={`rounded-xl border p-3 ${
                    c.severity === "critical"
                      ? "border-alarm/40 bg-alarm/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <AlertTriangle
                      className={`size-4 shrink-0 ${c.severity === "critical" ? "text-alarm" : "text-amber-600 dark:text-amber-400"}`}
                      aria-hidden
                    />
                    {localizeBi(c.message, locale)}
                    <span className="text-xs text-muted-foreground">
                      ({c.severity === "critical" ? r.sevCritical : r.sevWarning})
                    </span>
                  </p>
                  {c.evidence.length > 0 && (
                    <p dir="auto" className="mt-1 text-xs italic text-muted-foreground">
                      {c.evidence.map((e) => `“${e}”`).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </CardContent>
    </Card>
  );
}
