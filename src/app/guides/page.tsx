import type { Metadata } from "next";
import { getReviewedGuides } from "@/lib/guides";
import { GuideList } from "@/components/guides/guide-list";

export const metadata: Metadata = {
  title: "أدلة مراجعة عروض السفر — Offer review guides",
  description: "أدلة عملية موثقة لمراجعة السعر والإلغاء والترانزيت والأمتعة قبل دفع قيمة عرض السفر.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const guides = getReviewedGuides();
  return (
    <div className="container py-14 md:py-20">
      <GuideList guides={guides} />
    </div>
  );
}
