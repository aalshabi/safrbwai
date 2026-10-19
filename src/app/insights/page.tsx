import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { InsightList } from "@/components/insights/insight-list";
import {
  AirportStatusBannerLoader,
  AirportStatusCardLoader,
  AirportStatusSidebarLoader,
} from "@/components/airport-status/airport-status-loader";
import { getPublishedInsights } from "@/lib/travel-insights";

export const metadata: Metadata = pageMetadata({
  title: "مرصد السفر العالمي — Global Travel Monitor",
  description:
    "مواضيع سفر حديثة موثقة بمصادرها، مع حالة المطارات، تساعدك على التحقق من الحجز والاختيار الواعي قبل أن تدفع قيمة رحلتك.",
  path: "/insights",
  image: "insights",
});

export default function InsightsPage() {
  const insights = getPublishedInsights();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: insights.map((insight, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `/insights/${insight.slug}`,
      name: insight.title.ar,
    })),
  };

  return (
    <div className="container py-14 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-8">
        <div className="min-w-0">
          {/* Mobile: slim banner. Tablet: compact card. Desktop: sidebar below.
              No inner Suspense: a streamed swap above the list would shift it
              (CLS). The route's loading.tsx covers the initial load, and the
              feed call is bounded (see providers.ts). */}
          <AirportStatusBannerLoader className="mb-8 md:hidden" />
          <AirportStatusCardLoader className="mb-10 hidden md:block xl:hidden" />
          <InsightList insights={insights} />
        </div>
        <div className="hidden xl:block">
          <AirportStatusSidebarLoader />
        </div>
      </div>
    </div>
  );
}
