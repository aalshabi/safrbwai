"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Compass,
  LayoutDashboard,
  PiggyBank,
  Plane,
  ShieldCheck,
  Tag,
  BarChart3,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { useAuth } from "@/hooks/use-auth";
import { getAnalyses, clearAnalyses, type SavedAnalysis, type AnalysisType } from "@/lib/storage";
import { formatNumber, scoreColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";

const typeIcon: Record<AnalysisType, typeof Building2> = {
  hotel: Building2,
  destination: Compass,
  offer: Tag,
  compare: BarChart3,
};

export function DashboardView() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const td = t.dashboard;
  const [items, setItems] = React.useState<SavedAnalysis[]>([]);

  React.useEffect(() => {
    const load = () => setItems(getAnalyses());
    load();
    window.addEventListener("safer-bewae-storage", load);
    return () => window.removeEventListener("safer-bewae-storage", load);
  }, []);

  const estimatedSaved = items.reduce((sum, i) => sum + Math.round((100 - i.score) * 12 + 180), 0);
  const tricks = items.filter((i) => i.score < 60).length;

  const stats = [
    { icon: ShieldCheck, label: td.savedAnalyses, value: formatNumber(items.length, locale) },
    {
      icon: PiggyBank,
      label: td.totalSaved,
      value: `${formatNumber(estimatedSaved, locale)} ${locale === "ar" ? "ر.س" : "SAR"}`,
    },
    { icon: Plane, label: td.tripsPlanned, value: formatNumber(items.length, locale) },
    { icon: LayoutDashboard, label: td.tricksAvoided, value: formatNumber(tricks, locale) },
  ];

  const quickActions = [
    { href: "/analyze-hotel", icon: Building2, label: t.nav.analyzeHotel },
    { href: "/analyze-destination", icon: Compass, label: t.nav.analyzeDestination },
    { href: "/analyze-offer", icon: Tag, label: t.nav.analyzeOffer },
    { href: "/compare-hotels", icon: BarChart3, label: t.nav.compareHotels },
  ];

  const greeting = user?.name || user?.email?.split("@")[0] || (locale === "ar" ? "المسافر الواعي" : "conscious traveler");

  return (
    <>
      <PageHeader icon={LayoutDashboard} title={`${td.welcome}، ${greeting}`} subtitle={td.subtitle} />
      <div className="container mt-10 space-y-8 pb-20">
        {/* stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid size-11 place-items-center rounded-xl bg-teal/10 text-teal">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <p className="ltr-nums font-display text-xl font-extrabold text-foreground">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* recent activity */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{td.recentActivity}</CardTitle>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearAnalyses();
                    setItems([]);
                  }}
                  className="text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-muted-foreground">{td.noActivity}</p>
                  <Button asChild>
                    <Link href="/analyze-hotel">{td.startAnalysis}</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const Icon = typeIcon[item.type];
                    return (
                      <li key={item.id} className="flex items-center gap-4 py-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString(
                              locale === "ar" ? "ar-SA-u-nu-latn" : "en-US"
                            )}
                          </p>
                        </div>
                        <Badge variant="outline" className={scoreColor(item.score)}>
                          <span className="ltr-nums">{item.score}%</span>
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* quick actions */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{td.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-teal/40 hover:bg-teal/5"
                >
                  <div className="grid size-9 place-items-center rounded-lg bg-navy text-white">
                    <a.icon className="size-4 text-teal-400" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{a.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
