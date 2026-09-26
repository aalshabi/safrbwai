"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getNavigableCapabilities } from "@/lib/product/capabilities";

export function Navbar() {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  const links = getNavigableCapabilities();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border glass shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="container flex h-16 items-center justify-between gap-4">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.route;
            return (
              <li key={link.key}>
                <Link
                  href={link.route}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    link.key === "textOfferAnalysis"
                      ? "bg-teal text-white hover:bg-teal/90"
                      : active
                        ? "text-teal"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{link.title[locale]}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-border glass transition-[max-height] duration-300",
          open ? "max-h-[80vh]" : "max-h-0 border-t-0"
        )}
      >
        <ul className="container flex flex-col gap-1 py-4">
          {links.map((link) => (
            <li key={link.key}>
              <Link
                href={link.route}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-base font-semibold transition-colors",
                  pathname === link.route
                    ? "bg-teal/10 text-teal"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <span>{link.title[locale]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
