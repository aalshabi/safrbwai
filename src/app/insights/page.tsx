import type { Metadata } from "next";
import { InsightList } from "@/components/insights/insight-list";
import { getPublishedInsights } from "@/lib/travel-insights";

export const metadata: Metadata = {
  title: "مرصد السفر العالمي — Global Travel Monitor",
  description: "مواضيع سفر حديثة موثقة تساعد المسافر على التحقق والاختيار الواعي قبل الحجز.",
  alternates: { canonical: "/insights" },
};

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
      <InsightList insights={insights} />
    </div>
  );
}
