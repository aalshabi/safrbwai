"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import { Logo } from "@/components/shared/logo";
import { getNavigableCapabilities } from "@/lib/product/capabilities";

export function Footer() {
  const { locale, t } = useLanguage();
  const year = 2026;
  const productLinks = getNavigableCapabilities().map((capability) => ({
    href: capability.route,
    label: capability.title[locale],
  }));

  const columns = [
    {
      title: t.footer.product,
      links: productLinks,
    },
    {
      title: t.footer.company,
      links: [
        { href: "/#about", label: t.footer.about },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: "/privacy", label: t.footer.privacy },
        { href: "/terms", label: t.footer.terms },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{t.footer.tagline}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="space-y-3">
            <h3 className="font-display text-sm font-bold text-foreground">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-teal"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground md:flex-row">
          <p>
            © {year} {t.brand.name} · {t.footer.rights}
          </p>
          <p>{t.footer.builtBy}</p>
        </div>
      </div>
    </footer>
  );
}
