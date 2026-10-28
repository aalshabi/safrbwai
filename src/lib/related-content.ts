import { getGuide, type TravelGuide } from "@/lib/guides";
import { getInsight, type TravelInsight } from "@/lib/travel-insights";

/**
 * Hand-picked "related reading" links between guides and insights. Each pair
 * shares a decision the reader is making (total price, refunds, where to
 * book, checking a plan), not just a keyword. Unpublished targets are dropped
 * at render time, so a link never points at a 404.
 */

export type ContentRef = { kind: "guide" | "insight"; slug: string };

const key = ({ kind, slug }: ContentRef) => `${kind}:${slug}`;

export const RELATED_CONTENT: Readonly<Record<string, readonly ContentRef[]>> = {
  "guide:total-price-and-inclusions": [
    { kind: "guide", slug: "cancellation-and-changes" },
    { kind: "insight", slug: "verify-hotel-booking-site" },
  ],
  "guide:cancellation-and-changes": [
    { kind: "guide", slug: "total-price-and-inclusions" },
    { kind: "insight", slug: "verify-hotel-booking-site" },
  ],
  "guide:transit-and-baggage": [
    { kind: "guide", slug: "total-price-and-inclusions" },
    { kind: "insight", slug: "ai-trip-planning-human-review" },
  ],
  "guide:maldives-trip-planning": [
    { kind: "guide", slug: "before-travel-checklist" },
    { kind: "guide", slug: "total-price-and-inclusions" },
  ],
  "guide:before-travel-checklist": [
    { kind: "guide", slug: "transit-and-baggage" },
    { kind: "insight", slug: "schengen-2026-ees-etias-saudi-travelers" },
  ],
  "insight:verify-hotel-booking-site": [
    { kind: "guide", slug: "total-price-and-inclusions" },
    { kind: "guide", slug: "cancellation-and-changes" },
    { kind: "insight", slug: "award-winning-hotel-fit" },
  ],
  "insight:award-winning-hotel-fit": [
    { kind: "insight", slug: "verify-hotel-booking-site" },
    { kind: "guide", slug: "total-price-and-inclusions" },
  ],
  "insight:ai-trip-planning-human-review": [
    { kind: "guide", slug: "transit-and-baggage" },
    { kind: "guide", slug: "total-price-and-inclusions" },
  ],
  "insight:flight-cancelled-saudi-airports-rights": [
    { kind: "guide", slug: "cancellation-and-changes" },
    { kind: "guide", slug: "transit-and-baggage" },
  ],
  "insight:schengen-2026-ees-etias-saudi-travelers": [
    { kind: "guide", slug: "transit-and-baggage" },
    { kind: "insight", slug: "ai-trip-planning-human-review" },
  ],
  "insight:japan-trip-hidden-taxes-2026": [
    { kind: "guide", slug: "total-price-and-inclusions" },
    { kind: "insight", slug: "verify-hotel-booking-site" },
  ],
};

export type RelatedLink = { href: string; kind: ContentRef["kind"]; title: (TravelGuide | TravelInsight)["title"] };

function resolve(ref: ContentRef): RelatedLink | undefined {
  if (ref.kind === "guide") {
    const guide = getGuide(ref.slug);
    return guide?.status === "reviewed" ? { href: `/guides/${guide.slug}`, kind: "guide", title: guide.title } : undefined;
  }
  const insight = getInsight(ref.slug);
  return insight?.status === "published" ? { href: `/insights/${insight.slug}`, kind: "insight", title: insight.title } : undefined;
}

export function getRelatedLinks(from: ContentRef): RelatedLink[] {
  return (RELATED_CONTENT[key(from)] ?? []).flatMap((ref) => resolve(ref) ?? []);
}
