import type { Locale } from "@/lib/i18n/config";
import type { Bi } from "@/lib/offer-pipeline/types";
import { formatNumber } from "@/lib/utils";

export interface ResultValueLabels {
  yes: string;
  no: string;
  adults: string;
  children: string;
  destinationStated: string;
}

export function localizeBi(value: Bi, locale: Locale): string {
  return locale === "ar" ? value.ar : value.en;
}

export function formatResultValue(
  value: unknown,
  locale: Locale,
  labels: ResultValueLabels
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? labels.yes : labels.no;
  if (typeof value === "number") return formatNumber(value, locale);
  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (
      typeof record.value === "string" &&
      typeof record.matchType === "string"
    ) {
      if (
        record.matchType === "canonical_alias" &&
        typeof record.canonicalValue === "string" &&
        record.canonicalValue !== record.value
      ) {
        return `${record.value} (${record.canonicalValue})`;
      }

      return record.matchType === "explicit_mention"
        ? `${labels.destinationStated}: ${record.value}`
        : record.value;
    }

    if (
      typeof record.amount === "number" &&
      typeof record.currency === "string"
    ) {
      return `${formatNumber(record.amount, locale)} ${record.currency}`;
    }

    if (typeof record.included === "boolean") {
      return record.included ? labels.yes : labels.no;
    }

    if (typeof record.minutes === "number") {
      if (record.minutes % 60 === 0) {
        const hours = record.minutes / 60;
        return locale === "ar"
          ? `${formatNumber(hours, locale)} ساعات`
          : `${formatNumber(hours, locale)} hours`;
      }
      return locale === "ar"
        ? `${formatNumber(record.minutes, locale)} دقيقة`
        : `${formatNumber(record.minutes, locale)} minutes`;
    }

    if ("adults" in record || "children" in record) {
      const parts: string[] = [];
      if (typeof record.adults === "number") {
        parts.push(
          `${labels.adults}: ${formatNumber(record.adults, locale)}`
        );
      }
      if (typeof record.children === "number") {
        parts.push(
          `${labels.children}: ${formatNumber(record.children, locale)}`
        );
      }
      return parts.join("، ");
    }
  }

  return String(value);
}
