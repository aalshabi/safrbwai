"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { RelatedLink } from "@/lib/related-content";
import { useLanguage } from "@/lib/i18n/provider";

/** "Related reading" block under a guide or insight. Reuses existing utility classes only. */
export function RelatedLinks({ links }: { links: readonly RelatedLink[] }) {
  const { locale } = useLanguage();
  if (links.length === 0) return null;
  const copy = locale === "ar"
    ? { title: "مواضيع ذات صلة", guide: "دليل", insight: "مرصد السفر" }
    : { title: "Related reading", guide: "Guide", insight: "Travel monitor" };

  return (
    <nav aria-labelledby="related-reading" className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-muted/30 p-6">
      <h2 id="related-reading" className="font-display text-xl font-bold">{copy.title}</h2>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <p className="text-xs text-muted-foreground">{copy[link.kind]}</p>
            <Link className="mt-1 inline-flex items-center gap-2 font-semibold text-teal" href={link.href}>
              {link.title[locale]}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
