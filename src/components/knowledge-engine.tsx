"use client";

import * as React from "react";
import {
  Search,
  Sparkles,
  BedDouble,
  Compass,
  Lightbulb,
  Stamp,
  Plane,
  CloudSun,
  Ticket,
  Database,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import {
  knowledgeBase,
  knowledgeCategories,
  searchKnowledge,
  type KnowledgeCategory,
} from "@/lib/knowledge";
import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";

const CATEGORY_ICONS: Record<KnowledgeCategory, LucideIcon> = {
  hotels: BedDouble,
  destinations: Compass,
  tips: Lightbulb,
  visa: Stamp,
  flights: Plane,
  weather: CloudSun,
  activities: Ticket,
};

function relevanceColor(r: number) {
  if (r >= 70) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (r >= 40) return "border-teal/30 bg-teal/10 text-teal-600 dark:text-teal-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-600";
}

export function KnowledgeEngine() {
  const { t, locale } = useLanguage();
  const tk = t.knowledge;
  const e = tk.engine;

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<KnowledgeCategory | "all">("all");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const hits = React.useMemo(() => searchKnowledge(query, category), [query, category]);
  const searching = query.trim().length > 0;

  const filters: (KnowledgeCategory | "all")[] = ["all", ...knowledgeCategories];

  return (
    <>
      <PageHeader icon={Database} title={tk.title} subtitle={tk.subtitle} />
      <div className="container -mt-8 pb-20">
        {/* Search card */}
        <Card className="mx-auto max-w-3xl shadow-xl">
          <CardContent className="p-6 md:p-7">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder={e.searchPlaceholder}
                className="h-14 ps-12 text-base"
                aria-label={e.searchPlaceholder}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1.5">
                <Sparkles className="size-3.5" />
                {e.semanticBadge}
              </Badge>
              <span className="text-xs text-muted-foreground">
                <span className="ltr-nums font-semibold">{knowledgeBase.length}</span> {e.entriesStored}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">{e.tryExamples}</span>
              {e.examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setQuery(ex);
                    setCategory("all");
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-teal/50 hover:bg-teal/5"
                >
                  {ex}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category filters */}
        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setCategory(f)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                category === f
                  ? "bg-navy text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {tk.categories[f]}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="mx-auto mt-8 max-w-4xl">
          {searching && (
            <p className="mb-5 text-sm text-muted-foreground">
              <span className="ltr-nums font-bold text-foreground">{formatNumber(hits.length, locale)}</span>{" "}
              {e.resultsCount} {e.resultsFor} “<span className="font-semibold text-foreground">{query}</span>”
            </p>
          )}
          {!searching && (
            <h2 className="mb-5 font-display text-lg font-bold text-foreground">{e.browseTitle}</h2>
          )}

          {hits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
              <SearchX className="size-9 text-muted-foreground" />
              <p className="text-muted-foreground">{e.noResults}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {hits.map(({ entry, relevance }) => {
                const Icon = CATEGORY_ICONS[entry.category];
                return (
                  <Card
                    key={entry.id}
                    className="group transition-all duration-300 hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-lg hover:shadow-teal/5"
                  >
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <Badge variant="navy" className="gap-1.5">
                          <Icon className="size-3.5" />
                          {tk.categories[entry.category]}
                        </Badge>
                        {searching && (
                          <span
                            className={cn(
                              "ltr-nums rounded-full border px-2.5 py-0.5 text-xs font-bold",
                              relevanceColor(relevance)
                            )}
                          >
                            {relevance}% {e.relevance}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold leading-snug text-foreground">
                        {entry.title[locale]}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {entry.summary[locale]}
                      </p>
                      {searching && (
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-teal transition-all duration-500"
                            style={{ width: `${relevance}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
