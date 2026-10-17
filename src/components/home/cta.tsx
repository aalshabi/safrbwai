"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";

export function CTA() {
  const { t } = useLanguage();
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-navy px-8 py-16 text-center md:px-16 md:py-20">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 25% 20%, rgba(0,167,182,0.35), transparent 45%), radial-gradient(circle at 80% 90%, rgba(0,167,182,0.2), transparent 40%)",
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold text-white md:text-4xl">
                {t.cta.title}
              </h2>
              <p className="mt-4 text-white/70">{t.cta.subtitle}</p>
              <Button asChild size="lg" variant="bright" className="mt-8">
                <Link href="/analyze-offer">
                  {t.cta.button}
                  <ArrowLeft className="size-4 ltr:rotate-180" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
