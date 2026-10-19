import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { PREVIEW_PAGE_ROBOTS } from "@/lib/seo";
import { CompareHotels } from "@/components/analyzers/compare-hotels";

export const metadata: Metadata = pageMetadata({
  title: "معاينة مقارنة الفنادق — Hotel comparison preview",
  description:
    "معاينة واجهة فقط؛ لا تُنتج مقارنة فنادق أو أسعار أو توفر فعليًا. Interface preview only; no live hotel, price, or availability comparison is produced.",
  path: "/compare-hotels",
  image: "tools",
  robots: PREVIEW_PAGE_ROBOTS,
});

export default function Page() {
  return <CompareHotels />;
}
