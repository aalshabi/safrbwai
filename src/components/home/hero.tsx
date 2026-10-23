"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-navy">
      {/* glow field */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(0,167,182,0.25), transparent 45%), radial-gradient(circle at 80% 15%, rgba(0,167,182,0.14), transparent 40%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container relative py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className="enter-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-sm font-semibold text-teal-400"
            style={{ animationDelay: "0ms" }}
          >
            <Sparkles className="size-4" />
            {t.hero.badge}
          </div>

          <h1
            className="enter-up text-balance font-display text-4xl font-extrabold leading-[1.15] text-white md:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            {t.hero.title}
          </h1>

          <p
            className="enter-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70"
            style={{ animationDelay: "160ms" }}
          >
            {t.hero.subtitle}
          </p>

          <div
            className="enter-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/analyze-offer">
                {t.hero.ctaPrimary}
                <ArrowLeft className="size-4 ltr:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"
            >
              <Link href="#how">{t.hero.ctaSecondary}</Link>
            </Button>
          </div>

          <p
            className="enter-up mt-6 inline-flex items-center gap-2 text-sm text-white/50"
            style={{ animationDelay: "360ms" }}
          >
            <ShieldCheck className="size-4 text-teal-400" />
            {t.hero.trustLine}
          </p>
        </div>
      </div>

      {/* bottom fade into page */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
