"use client";

import * as React from "react";
import { BarChart3, Plus, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyzerPreview } from "@/components/shared/analyzer-preview";

// UI-preview only: no engine call, no scores, no persistence — and no
// simulated wait. Nothing is being computed, so the result appears at once
// rather than behind a spinner that would claim work is happening.

export function CompareHotels() {
  const { t } = useLanguage();
  const tc = t.compare;
  const th = t.analyzeHotel;
  const [names, setNames] = React.useState<string[]>(["", ""]);
  const [submitted, setSubmitted] = React.useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const futureItems = [
    th.deep.categories.valueForMoney,
    th.deep.categories.location,
    th.deep.categories.family,
    th.deep.categories.honeymoon,
    th.deep.categories.food,
    th.metrics.reviewAuthenticity,
    th.metrics.priceTransparency,
    th.metrics.hiddenFees,
  ];

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }
  function addHotel() {
    if (names.length < 4) setNames((prev) => [...prev, ""]);
  }
  function removeHotel(i: number) {
    if (names.length > 2) setNames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onCompare(e: React.FormEvent) {
    e.preventDefault();
    const filled = names.filter((n) => n.trim().length > 0);
    if (filled.length < 2) {
      toast.error(tc.needTwo);
      return;
    }
    setSubmitted(true);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  return (
    <>
      <PageHeader icon={BarChart3} title={tc.title} subtitle={tc.subtitle} />
      <div className="container -mt-8 pb-20">
        <Card className="mx-auto max-w-2xl shadow-xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={onCompare} className="space-y-4">
              {names.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal/10 font-display text-sm font-bold text-teal ltr-nums">
                    {i + 1}
                  </span>
                  <Input
                    value={name}
                    onChange={(e) => updateName(i, e.target.value)}
                    placeholder={`${tc.hotelName} ${i + 1}`}
                  />
                  {names.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHotel(i)}
                      aria-label={tc.remove}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {names.length < 4 && (
                  <Button type="button" variant="outline" onClick={addHotel} className="sm:flex-1">
                    <Plus className="size-4" />
                    {tc.addHotel}
                  </Button>
                )}
                <Button type="submit" size="default" className="sm:flex-1">
                  <Sparkles className="size-4" />
                  {tc.compareBtn}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div ref={resultRef} className="mx-auto mt-8 max-w-4xl scroll-mt-24">
          {submitted && <AnalyzerPreview futureItems={futureItems} />}
        </div>
      </div>
    </>
  );
}
