"use client";

import * as React from "react";
import { Compass, Sparkles } from "lucide-react";
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

export function DestinationAdvisor() {
  const { t } = useLanguage();
  const td = t.analyzeDestination;
  const a = td.advisor;

  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [date, setDate] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [adults, setAdults] = React.useState("2");
  const [children, setChildren] = React.useState("0");
  const [submitted, setSubmitted] = React.useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  const futureItems = [a.weather, a.crowd, a.price, a.safetyTitle, a.events, a.avgCost, a.hotels, a.itinerary];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country.trim() || !city.trim()) return;
    setSubmitted(true);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  return (
    <>
      <PageHeader icon={Compass} title={td.title} subtitle={td.subtitle} />
      <div className="container -mt-8 pb-20">
        <Card className="mx-auto max-w-2xl shadow-xl">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="d-country">{a.country}</Label>
                  <Input
                    id="d-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder={a.countryPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-city">{a.city}</Label>
                  <Input
                    id="d-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={a.cityPlaceholder}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="d-date">{a.travelDate}</Label>
                  <Input
                    id="d-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="ltr-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-budget">{a.budget}</Label>
                  <Input
                    id="d-budget"
                    type="number"
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={a.budgetPlaceholder}
                    className="ltr-nums"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="d-adults">{a.adults}</Label>
                  <Input
                    id="d-adults"
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(e.target.value)}
                    className="ltr-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="d-children">{a.children}</Label>
                  <Input
                    id="d-children"
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) => setChildren(e.target.value)}
                    className="ltr-nums"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full">
                <Sparkles className="size-4" />
                {a.adviseCta}
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
