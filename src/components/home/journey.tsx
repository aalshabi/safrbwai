"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Map, SearchCheck, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

type Stage = {
  icon: LucideIcon;
  step: string;
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  core?: boolean;
};

/**
 * The three stages of a trip — choosing, booking, preparing — each pointing to
 * the existing tool or guide for that stage. The middle one is the core feature.
 */
export function Journey() {
  const { locale } = useLanguage();
  const ar = locale === "ar";
  const copy = ar
    ? {
        promise: "اختر وجهتك، افهم عرضك، وسافر بوعي",
        intro: "ثلاث محطات قبل أن تدفع وقبل أن تسافر. كل محطة لها أداة أو دليل مختصر مبني على مصادر رسمية.",
      }
    : {
        promise: "Choose your destination, understand your offer, travel aware",
        intro: "Three stops before you pay and before you fly. Each has a tool or a short guide based on official sources.",
      };

  const stages: Stage[] = ar
    ? [
        {
          icon: Map,
          step: "قبل اختيار الوجهة",
          title: "هل تناسبك الوجهة؟",
          body: "لمن تناسب، ومتى تسافر، وكم يومًا، وما الذي يحدد الميزانية والتنقل، وأخطاء التخطيط الشائعة.",
          primary: { href: "/guides/maldives-trip-planning", label: "دليل المالديف" },
          secondary: { href: "/insights", label: "مرصد السفر" },
        },
        {
          icon: SearchCheck,
          step: "قبل الحجز",
          title: "افهم عرضك قبل تحجز",
          body: "ألصق نص العرض لترى ما يذكره صراحة، وما ينقصه، وملاحظات تستحق التحقق، وأسئلة جاهزة للنسخ لمقدم العرض.",
          primary: { href: "/analyze-offer", label: "حلّل عرضك" },
          secondary: { href: "/guides", label: "أدلة مراجعة العرض" },
          core: true,
        },
        {
          icon: ClipboardCheck,
          step: "قبل السفر",
          title: "جهّز رحلتك",
          body: "الوثائق والانتقالات والتأمين ومتطلبات الدخول، مكتوبة للمسافر بجواز سعودي مع روابط المصادر الرسمية.",
          primary: { href: "/guides/before-travel-checklist", label: "قائمة ما قبل السفر" },
        },
      ]
    : [
        {
          icon: Map,
          step: "Before choosing a destination",
          title: "Does the destination suit you?",
          body: "Who it suits, when to go, how long to stay, what drives budget and transport, and common planning mistakes.",
          primary: { href: "/guides/maldives-trip-planning", label: "Maldives guide" },
          secondary: { href: "/insights", label: "Travel watch" },
        },
        {
          icon: SearchCheck,
          step: "Before booking",
          title: "Understand your offer before you book",
          body: "Paste the offer text to see what it states, what is missing, points worth checking, and ready-to-copy questions for the provider.",
          primary: { href: "/analyze-offer", label: "Analyze your offer" },
          secondary: { href: "/guides", label: "Offer review guides" },
          core: true,
        },
        {
          icon: ClipboardCheck,
          step: "Before you travel",
          title: "Get ready to go",
          body: "Documents, transfers, insurance, and entry requirements, written for Saudi passport holders with links to official sources.",
          primary: { href: "/guides/before-travel-checklist", label: "Pre-travel checklist" },
        },
      ];

  return (
    <section className="border-b border-border bg-background" aria-labelledby="journey-title">
      <div className="container py-16">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 id="journey-title" className="font-display text-2xl font-extrabold text-foreground md:text-3xl">
            {copy.promise}
          </h2>
          <p className="mt-3 text-muted-foreground">{copy.intro}</p>
        </Reveal>
        <ol className="grid gap-6 md:grid-cols-3">
          {stages.map((stage, i) => (
            <li key={stage.step}>
              <Reveal index={i} className="h-full">
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border bg-card p-6",
                  stage.core ? "border-teal/50 ring-1 ring-teal/30" : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-teal/10 text-teal">
                    <stage.icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-teal">
                    <span className="ltr-nums">{i + 1}</span> · {stage.step}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-extrabold text-foreground">{stage.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{stage.body}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link
                    href={stage.primary.href}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold",
                      stage.core ? "bg-teal text-white hover:bg-teal/90" : "border border-border hover:bg-muted"
                    )}
                  >
                    {stage.primary.label}
                    <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                  </Link>
                  {stage.secondary ? (
                    <Link href={stage.secondary.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal hover:underline">
                      {stage.secondary.label}
                    </Link>
                  ) : null}
                </div>
              </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
