import type { Metadata } from "next";
import { PREVIEW_PAGE_ROBOTS } from "@/lib/seo";
import { DestinationAdvisor } from "@/components/analyzers/destination-advisor";

export const metadata: Metadata = {
  title: "مراجعة وجهة — Destination review (preview)",
  description:
    "معاينة لقائمة مراجعة الوجهة؛ القائمة الفعلية غير مفعّلة بعد. Preview of a destination checklist; the real checklist is not enabled yet.",
  robots: PREVIEW_PAGE_ROBOTS,
  alternates: { canonical: "/analyze-destination" },
};

export default function Page() {
  return <DestinationAdvisor />;
}
