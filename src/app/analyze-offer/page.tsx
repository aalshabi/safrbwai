import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { OfferAnalyzer } from "@/components/analyzers/offer-analyzer";

export const metadata: Metadata = pageMetadata({
  title: "حلّل عرض سفرك — Analyze your travel offer",
  description:
    "حلّل عرض السفر من نصه أو ملف PDF أو صورة أو رابط، وراجع المعلومات المذكورة فيه قبل الحجز. Analyze a travel offer from its text, a PDF, an image or a link, and review the stated information before booking.",
  path: "/analyze-offer",
  image: "tools",
});

export default function Page() {
  return <OfferAnalyzer />;
}
