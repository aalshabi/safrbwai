/**
 * "حالة المطارات الآن" — server-rendered, no client JavaScript.
 * Mobile: a slim banner on a native <details> (keyboard and screen-reader
 * expand/collapse with no hydration). Tablet: a compact card in the content.
 * Desktop: a sticky sidebar.
 */

import { AlertTriangle, Ban, CheckCircle2, ChevronDown, Clock, ExternalLink, HelpCircle, Info, Plane } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { DISRUPTION_MAP, REFERENCE_SOURCES } from "@/lib/airport-status/sources";
import { STATUS_LABEL_AR } from "@/lib/airport-status/status";
import type { DisplayedStatus, LinkRef } from "@/lib/airport-status/types";
import type { AirportRow, AirportStatusView } from "@/lib/airport-status/view";
import { cn } from "@/lib/utils";

export const TITLE = "حالة المطارات الآن";
export const NOTICE = "تحقق من حالة رحلتك لدى شركة الطيران قبل التوجه إلى المطار؛ قد تتغير العمليات خلال وقت قصير.";
export const UNAVAILABLE_MESSAGE = "تعذر تحديث البيانات حاليًا";

const STATUS_STYLE: Record<DisplayedStatus, { icon: ComponentType<{ className?: string }>; tone: string }> = {
  normal: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" },
  minor_delays: { icon: Clock, tone: "bg-amber-500/15 text-amber-900 dark:text-amber-300" },
  major_disruption: { icon: AlertTriangle, tone: "bg-orange-500/15 text-orange-900 dark:text-orange-300" },
  suspended: { icon: Ban, tone: "bg-red-500/15 text-red-800 dark:text-red-300" },
  unavailable: { icon: HelpCircle, tone: "bg-muted text-muted-foreground" },
};

/** Collapsed-view summary of Saudi airports, from verified Saudi records only. */
export function saudiSummary(view: AirportStatusView): string {
  const { verified, total } = view.saudiCoverage;
  if (verified === 0) return `المطارات السعودية: ${STATUS_LABEL_AR.unavailable}`;
  const affected = view.saudiMostAffected ? ` — الأشد تأثرًا: ${view.saudiMostAffected}` : "";
  const coverage = verified < total ? ` · تغطية جزئية (${verified} من ${total})` : ` · ${total} من ${total} مطارات`;
  return `المطارات السعودية: ${STATUS_LABEL_AR[view.saudiOverall]}${affected}${coverage}`;
}

/** "مباشر" only for an authorized live provider; otherwise "آخر تحديث". */
export function updateLine(view: AirportStatusView): string {
  if (!view.lastUpdate) return "لا يوجد تحديث موثق بعد";
  return `${view.live ? "مباشر · " : ""}آخر تحديث: ${view.lastUpdate} بتوقيت الرياض`;
}

function StatusBadge({ status, large = false }: { status: DisplayedStatus; large?: boolean }) {
  const { icon: Icon, tone } = STATUS_STYLE[status];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold", large ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs", tone)}
      data-status={status}
    >
      <Icon className={large ? "size-4" : "size-3.5"} aria-hidden />
      {STATUS_LABEL_AR[status]}
    </span>
  );
}

function ExternalLinkTo({ to, children, className }: { to: LinkRef; children: ReactNode; className?: string }) {
  return (
    <a
      href={to.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-6 items-center gap-1 rounded-sm font-semibold text-foreground underline decoration-teal decoration-2 underline-offset-4 hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
        className
      )}
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">(يفتح في نافذة جديدة)</span>
    </a>
  );
}

const Code = ({ children }: { children: string }) => (
  <bdi dir="ltr" className="font-mono text-sm text-muted-foreground">
    {children}
  </bdi>
);

function SourceDetails({ row }: { row: AirportRow }) {
  if (!row.source) return null;
  return (
    <details className="text-xs">
      <summary className="inline-flex min-h-6 cursor-pointer items-center rounded-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
        تفاصيل المصدر
      </summary>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-muted-foreground">
        <dt>{row.lastKnown ? "مصدر آخر حالة" : "المصدر"}</dt>
        <dd>
          <ExternalLinkTo to={row.source}>{row.source.name}</ExternalLinkTo>
        </dd>
        <dt>نوع المصدر</dt>
        <dd>{row.sourceTypeLabel}</dd>
        <dt>درجة الثقة</dt>
        <dd>{row.confidenceLabel}</dd>
        {row.suspensionEvidence && (
          <>
            <dt>إشعار التوقف</dt>
            <dd>
              <ExternalLinkTo to={row.suspensionEvidence}>{row.suspensionEvidence.name}</ExternalLinkTo>
            </dd>
          </>
        )}
      </dl>
    </details>
  );
}

function Row({ row }: { row: AirportRow }) {
  return (
    <li className="rounded-xl border border-border bg-background/60 p-3" data-iata={row.airportCode} data-stale={row.isStale || undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold leading-6 text-foreground">
          {row.cityAr} <Code>{row.airportCode}</Code>
        </p>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{row.airportNameAr}</p>

      {row.statusMessage && <p className="mt-2 text-sm text-foreground">{row.statusMessage}</p>}
      {row.metrics.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm text-foreground">
          {row.metrics.map((m) => (
            <li key={m.label}>
              {m.label}: <bdi dir="ltr">{m.value}</bdi>
              {m.suffix ? ` ${m.suffix}` : null}
            </li>
          ))}
        </ul>
      )}
      {row.lastKnown && (
        <p className="mt-2 text-xs text-muted-foreground">
          بيانات قديمة — آخر حالة معروفة: {row.lastKnown.label} ({row.lastKnown.at} بتوقيت الرياض)
        </p>
      )}
      {row.lowConfidence && <p className="mt-2 text-xs text-muted-foreground">ثقة منخفضة في المصدر؛ لا تدخل في الملخص.</p>}
      {row.conflictNote && (
        <p className="mt-2 text-xs font-semibold text-foreground" data-conflict="true">
          {row.conflictNote}
        </p>
      )}
      {row.action && <p className="mt-2 text-sm font-semibold text-foreground">{row.action}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {row.observedAt && <span>آخر تحديث للمصدر: {row.observedAt} بتوقيت الرياض</span>}
        {row.officialLink && <ExternalLinkTo to={row.officialLink}>الموقع الرسمي: {row.officialLink.name}</ExternalLinkTo>}
        {row.airlineStatus && <ExternalLinkTo to={row.airlineStatus}>حالة الرحلات: {row.airlineStatus.name}</ExternalLinkTo>}
      </div>
      <div className="mt-1">
        <SourceDetails row={row} />
      </div>
    </li>
  );
}

function SaudiSection({ view, idPrefix }: { view: AirportStatusView; idPrefix: string }) {
  return (
    <section aria-labelledby={`${idPrefix}-saudi`}>
      <h3 id={`${idPrefix}-saudi`} className="mb-2 font-display text-sm font-bold text-foreground">
        المطارات السعودية
      </h3>
      <ul className="space-y-2">
        {view.saudi.map((row) => (
          <Row key={row.airportCode} row={row} />
        ))}
      </ul>
    </section>
  );
}

function GlobalSection({ view, idPrefix }: { view: AirportStatusView; idPrefix: string }) {
  return (
    <section aria-labelledby={`${idPrefix}-global`}>
      <h3 id={`${idPrefix}-global`} className="mb-2 font-display text-sm font-bold text-foreground">
        أبرز الاضطرابات عالميًا
      </h3>
      {view.global.length > 0 ? (
        <ul className="space-y-2">
          {view.global.map((row) => (
            <Row key={row.airportCode} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {view.globalUnavailable ? "بيانات الاضطرابات العالمية غير متاحة حاليًا." : "لا توجد اضطرابات عالمية موثقة في آخر تحديث."}
        </p>
      )}
    </section>
  );
}

function NoticeSection({ idPrefix }: { idPrefix: string }) {
  return (
    <section aria-labelledby={`${idPrefix}-notice`} className="space-y-3 border-t border-border pt-4 text-sm">
      <h3 id={`${idPrefix}-notice`} className="font-display text-sm font-bold text-foreground">
        تنبيه المسافر
      </h3>
      <p className="flex gap-2 text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        {NOTICE}
      </p>
      <ExternalLinkTo to={DISRUPTION_MAP}>عرض خريطة الاضطرابات العالمية</ExternalLinkTo>
      <details>
        <summary className="inline-flex min-h-6 cursor-pointer items-center rounded-sm text-xs font-bold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
          مصادر رسمية ومراجع للتحقق
        </summary>
        <ul className="mt-2 space-y-1.5 text-xs">
          {REFERENCE_SOURCES.map((s) => (
            <li key={s.url}>
              <ExternalLinkTo to={s}>{s.labelAr}</ExternalLinkTo>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function StateNotes({ view }: { view: AirportStatusView }) {
  return (
    <>
      {view.isSample && (
        <p className="rounded-lg border border-dashed border-amber-500/60 p-2 text-xs font-bold text-amber-900 dark:text-amber-300">
          بيانات تجريبية للتطوير — ليست حالة حقيقية
        </p>
      )}
      {!view.hasCurrentData && (
        <div role="status" className="rounded-xl bg-muted p-3 text-sm">
          <p className="font-bold text-foreground">{UNAVAILABLE_MESSAGE}</p>
          <p className="mt-1 text-muted-foreground">
            {view.lastUpdate ? `آخر تحديث ناجح: ${view.lastUpdate} بتوقيت الرياض` : "لا يوجد تحديث موثق بعد. تحقق من الروابط الرسمية أدناه."}
          </p>
        </div>
      )}
      {view.hasCurrentData && view.refreshFailed && (
        <p className="text-xs text-muted-foreground">تعذر التحديث الأخير؛ تُعرض آخر بيانات ناجحة مع وقتها.</p>
      )}
    </>
  );
}

function Header({ view, id }: { view: AirportStatusView; id: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy text-teal" aria-hidden>
        <Plane className="size-4" />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-base font-extrabold text-foreground">
          {TITLE}
        </h2>
        <p className="text-xs text-muted-foreground">{updateLine(view)}</p>
      </div>
    </div>
  );
}

function Summary({ view }: { view: AirportStatusView }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={view.saudiCoverage.verified > 0 ? view.saudiOverall : "unavailable"} large />
      <span className="text-xs text-muted-foreground">{saudiSummary(view)}</span>
    </div>
  );
}

/** Desktop (≥1280px): sticky sidebar clear of the sticky header. */
export function AirportStatusSidebar({ view, className }: { view: AirportStatusView; className?: string }) {
  const id = "airport-status-sidebar";
  return (
    <aside
      dir="rtl"
      lang="ar"
      aria-labelledby={`${id}-title`}
      className={cn(
        "sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <Header view={view} id={`${id}-title`} />
      <div className="mt-4">
        <Summary view={view} />
      </div>
      <div className="mt-5 space-y-5">
        <StateNotes view={view} />
        <SaudiSection view={view} idPrefix={id} />
        <GlobalSection view={view} idPrefix={id} />
        <NoticeSection idPrefix={id} />
      </div>
    </aside>
  );
}

/** Tablet (768–1279px): compact card in the content flow, two columns. */
export function AirportStatusCard({ view, className }: { view: AirportStatusView; className?: string }) {
  const id = "airport-status-card";
  return (
    <section dir="rtl" lang="ar" aria-labelledby={`${id}-title`} className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Header view={view} id={`${id}-title`} />
        <Summary view={view} />
      </div>
      <div className="mt-5 space-y-5">
        <StateNotes view={view} />
        <div className="grid gap-5 md:grid-cols-2">
          <SaudiSection view={view} idPrefix={id} />
          <GlobalSection view={view} idPrefix={id} />
        </div>
        <NoticeSection idPrefix={id} />
      </div>
    </section>
  );
}

/** Mobile (<768px): slim banner with the key verified status; expands to the full list. */
export function AirportStatusBanner({ view, className }: { view: AirportStatusView; className?: string }) {
  const id = "airport-status-banner";
  const { icon: Icon, tone } = STATUS_STYLE[view.saudiCoverage.verified > 0 ? view.saudiOverall : "unavailable"];
  return (
    <section dir="rtl" lang="ar" aria-labelledby={`${id}-title`} className={className}>
      <h2 id={`${id}-title`} className="sr-only">
        {TITLE}
      </h2>
      <details className="group rounded-2xl border border-border bg-card shadow-sm">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", tone)}>
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-sm font-extrabold text-foreground">{TITLE}</span>
            <span className="block text-xs leading-5 text-foreground">{saudiSummary(view)}</span>
            <span className="block text-xs leading-5 text-muted-foreground">{updateLine(view)}</span>
          </span>
          <span className="sr-only">عرض التفاصيل أو إخفاؤها</span>
          <ChevronDown
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <StateNotes view={view} />
          <SaudiSection view={view} idPrefix={id} />
          <GlobalSection view={view} idPrefix={id} />
          <NoticeSection idPrefix={id} />
        </div>
      </details>
    </section>
  );
}
