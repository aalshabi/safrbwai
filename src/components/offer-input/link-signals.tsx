"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import type { LinkSignal } from "@/lib/offer-input/url/link-check";
import { cn } from "@/lib/utils";

/** Notes about a link: prompts to verify, never a verdict on the site. */
export function LinkSignals({ signals, className }: { signals: readonly LinkSignal[]; className?: string }) {
  const { t } = useLanguage();
  const v = t.analyzeOffer.v1.url;
  if (signals.length === 0) return null;
  return (
    <section aria-label={v.signalsTitle} className={cn("rounded-lg border border-border bg-muted/30 p-3 text-sm", className)}>
      <h3 className="mb-2 text-xs font-bold text-muted-foreground">{v.signalsTitle}</h3>
      <ul className="space-y-1.5">
        {signals.map((s, i) => {
          const Icon = s.severity === "warn" ? AlertTriangle : Info;
          const message = v.signals[s.code].replace("{domain}", s.detail ?? "");
          return (
            <li key={`${s.code}-${i}`} data-signal={s.code} className="flex items-start gap-2">
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", s.severity === "warn" ? "text-amber-600 dark:text-amber-400" : "text-teal")}
                aria-hidden="true"
              />
              <span className="text-foreground">
                {message.split(s.detail ?? "\u0000").flatMap((part, j, parts) =>
                  j < parts.length - 1 ? [part, <bdi key={j} dir="ltr">{s.detail}</bdi>] : [part]
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
