import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { PREVIEW_PAGE_ROBOTS } from "@/lib/seo";
import { DestinationAdvisor } from "@/components/analyzers/destination-advisor";

export const metadata: Metadata = pageMetadata({
  title: "مراجعة وجهة — Destination review (preview)",
  description:
    "معاينة لقائمة مراجعة الوجهة؛ القائمة الفعلية غير مفعّلة بعد. Preview of a destination checklist; the real checklist is not enabled yet.",
  path: "/analyze-destination",
  image: "tools",
  robots: PREVIEW_PAGE_ROBOTS,
});

export default function Page() {
  return <DestinationAdvisor />;
}
