import type { Metadata } from "next";
import { HotelAnalyzer } from "@/components/analyzers/hotel-analyzer";
import {
  isPreviewDeployment,
  isServerHotelIdentityLookupEnabled,
} from "@/lib/hotel-data/config";
import { isFeatureEnabled } from "@/lib/product/capabilities";

export const metadata: Metadata = {
  title: "بحث هوية الفندق — Hotel identity lookup (preview)",
  description:
    "واجهة غير مفعّلة للبحث عن هوية الفندق من مصدر رسمي دون تقييمات أو أسعار أو توصيات. Disabled interface for source-backed hotel identity lookup without ratings, prices, or recommendations.",
  alternates: { canonical: "/analyze-hotel" },
};

export default function Page() {
  const enabled =
    isServerHotelIdentityLookupEnabled() &&
    (isFeatureEnabled("hotelIdentityLookup") || isPreviewDeployment());
  return <HotelAnalyzer enabled={enabled} />;
}
