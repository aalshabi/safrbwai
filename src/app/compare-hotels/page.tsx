import type { Metadata } from "next";
import { CompareHotels } from "@/components/analyzers/compare-hotels";

export const metadata: Metadata = {
  title: "معاينة مقارنة الفنادق — Hotel comparison preview",
  description:
    "معاينة واجهة فقط؛ لا تُنتج مقارنة فنادق أو أسعار أو توفر فعليًا. Interface preview only; no live hotel, price, or availability comparison is produced.",
  alternates: { canonical: "/compare-hotels" },
};

export default function Page() {
  return <CompareHotels />;
}
