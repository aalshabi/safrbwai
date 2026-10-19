import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { getReviewedGuides } from "@/lib/guides";
import { GuideList } from "@/components/guides/guide-list";

export const metadata: Metadata = pageMetadata({
  title: "أدلة مراجعة عروض السفر — Offer review guides",
  description:
    "أدلة عملية موثقة بمصادر رسمية لمراجعة السعر الشامل والمشمولات والإلغاء والاسترداد والترانزيت والأمتعة قبل دفع قيمة عرض السفر.",
  path: "/guides",
  image: "guides",
});

export default function GuidesPage() {
  const guides = getReviewedGuides();
  return (
    <div className="container py-14 md:py-20">
      <GuideList guides={guides} />
    </div>
  );
}
