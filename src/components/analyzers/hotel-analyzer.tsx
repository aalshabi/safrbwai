"use client";

import * as React from "react";
import { Building2, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyzerPreview } from "@/components/shared/analyzer-preview";

// UI-preview only: no engine call, no scores, no persistence — and no
// simulated wait. Nothing is being computed, so the result appears at once
// rather than behind a spinner that would claim work is happening.

export function HotelAnalyzer() {
  const { t } = useLanguage();
  const th = t.analyzeHotel;
  const d = th.deep;

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const futureItems = [
    d.categories.valueForMoney,
    d.categories.location,
    d.categories.family,
    d.categories.honeymoon,
    d.categories.luxury,
    d.categories.food,
    th.metrics.reviewAuthenticity,
    th.metrics.hiddenFees,
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitted(true);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  return (
    <>
      <PageHeader icon={Building2} title={th.title} subtitle={th.subtitle} />
      <div className="container -mt-8 pb-20">
        <Card className="mx-auto max-w-2xl shadow-xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="hotel-name">{th.inputLabel}</Label>
                <Input
                  id="hotel-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={th.inputPlaceholder}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-city">{th.cityLabel}</Label>
                <Input
                  id="hotel-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={th.cityPlaceholder}
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                <Sparkles className="size-4" />
                {t.common.analyze}
              </Button>
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
