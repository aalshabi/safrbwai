"use client";

import { useLanguage } from "@/lib/i18n/provider";
import { Reveal } from "@/components/shared/reveal";
import { SOCIAL_PROFILES } from "@/lib/social-highlights";

/**
 * Ownership disclosure. A visitor arriving from X should be able to see who
 * owns the site and that the owner also runs a travel agency, before relying
 * on an analysis the site gives them.
 */
export function About() {
  const { t } = useLanguage();

  return (
    <section id="about" aria-labelledby="about-title" className="section scroll-mt-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm md:p-8">
          <h2 id="about-title" className="font-display text-2xl font-extrabold text-foreground md:text-3xl">
            {t.about.title}
          </h2>
          <p className="mt-4 leading-relaxed text-foreground">{t.about.owner}</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{t.about.neutrality}</p>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t.about.follow}</span>
            <a
              href={SOCIAL_PROFILES.x}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.about.xLabel}
              className="font-semibold text-foreground underline decoration-teal decoration-2 underline-offset-4 hover:text-teal"
            >
              {t.about.x}
            </a>
            <a
              href={SOCIAL_PROFILES.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.about.tiktokLabel}
              className="font-semibold text-foreground underline decoration-teal decoration-2 underline-offset-4 hover:text-teal"
            >
              {t.about.tiktok}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
