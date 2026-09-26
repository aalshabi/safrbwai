import type { Locale } from "@/lib/i18n/config";

export const ANALYTICS_EVENT_NAMES = [
  "offer_analysis_started",
  "offer_analysis_completed",
  "offer_analysis_failed",
  "offer_analysis_output_copied",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type CopiedOutput = "questions" | "summary";

export type AnalyticsEvent = Readonly<{
  name: AnalyticsEventName;
  properties: Readonly<{
    locale: Locale;
    campaignSource?: string;
    outputType?: CopiedOutput;
  }>;
}>;

const CAMPAIGN_SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function sanitizeCampaignSource(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return CAMPAIGN_SOURCE_PATTERN.test(normalized) ? normalized : undefined;
}

export function campaignSourceFromSearch(search: string): string | undefined {
  return sanitizeCampaignSource(new URLSearchParams(search).get("utm_source"));
}

export function createAnalyticsEvent(
  name: unknown,
  input: unknown
): AnalyticsEvent | null {
  if (!ANALYTICS_EVENT_NAMES.includes(name as AnalyticsEventName)) return null;
  if (!input || typeof input !== "object") return null;

  const source = input as Record<string, unknown>;
  const locale = source.locale;
  if (locale !== "ar" && locale !== "en") return null;

  const properties: AnalyticsEvent["properties"] = {
    locale,
    ...(sanitizeCampaignSource(source.campaignSource)
      ? { campaignSource: sanitizeCampaignSource(source.campaignSource) }
      : {}),
    ...(name === "offer_analysis_output_copied" &&
    (source.outputType === "questions" || source.outputType === "summary")
      ? { outputType: source.outputType }
      : {}),
  };

  return { name: name as AnalyticsEventName, properties };
}
