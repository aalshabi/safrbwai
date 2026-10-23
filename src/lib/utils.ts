import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-teal-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export function scoreLabelKey(score: number): "excellent" | "good" | "caution" | "risky" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "caution";
  return "risky";
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US").format(n);
}
