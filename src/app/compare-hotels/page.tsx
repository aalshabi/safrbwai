import type { Metadata } from "next";
import { CompareHotels } from "@/components/analyzers/compare-hotels";

export const metadata: Metadata = {
  title: "مقارنة الفنادق — Compare hotels (preview)",
  description:
    "معاينة قبل الإطلاق لأداة مقارنة الفنادق؛ المقارنة الفعلية غير مفعّلة بعد. Pre-launch preview of a hotel comparison tool; the real comparison is not enabled yet.",
  alternates: { canonical: "/compare-hotels" },
};

export default function Page() {
  return <CompareHotels />;
}
