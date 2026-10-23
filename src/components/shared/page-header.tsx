"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Tool pages: a shorter header on phones so the tool starts in the first screen. */
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden border-b border-border bg-navy">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(0,167,182,0.35), transparent 45%), radial-gradient(circle at 85% 10%, rgba(0,167,182,0.15), transparent 40%)",
        }}
      />
      <div className={cn("container relative", compact ? "py-8 md:py-16" : "py-14 md:py-20")}>
        <div className="mx-auto max-w-2xl text-center">
          <div className={cn("mx-auto mb-5 size-14 place-items-center rounded-2xl bg-teal/15 ring-1 ring-teal/30", compact ? "hidden sm:grid" : "grid")}>
            <Icon className="size-7 text-teal-400" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white md:text-5xl">{title}</h1>
          <p className="mt-4 text-base text-white/70 md:text-lg">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
