"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  const { t } = useLanguage();
  return (
    <Link href="/" className={cn("flex min-h-11 items-center gap-2.5", className)} aria-label={t.brand.name}>
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-navy shadow-lg shadow-navy/25">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          {/* stylised compass / eye — "conscious travel" */}
          <circle cx="12" cy="12" r="9" stroke="#00A7B6" strokeWidth="1.8" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="#00A7B6" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8.5l2.4 5.6L12 13l-2.4 1.1L12 8.5z" fill="#00A7B6" />
        </svg>
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-extrabold text-navy dark:text-white">
            {t.brand.name}
          </span>
        </span>
      )}
    </Link>
  );
}
