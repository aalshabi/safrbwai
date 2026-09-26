"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { Reveal } from "@/components/shared/reveal";

export function Pillars() {
  const { t } = useLanguage();

  return (
    <section id="about" className="section scroll-mt-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">
            {t.pillars.title}
          </h2>
          <p className="mt-4 text-muted-foreground">{t.pillars.subtitle}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-5 sm:grid-cols-2">
          {t.pillars.items.map((p, i) => (
            <Reveal key={p.title} index={i}>
              <div className="group h-full rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 p-6 transition-all hover:border-teal/40">
                <div className="mb-4 font-display text-3xl font-extrabold text-teal/30 ltr-nums transition-colors group-hover:text-teal">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
