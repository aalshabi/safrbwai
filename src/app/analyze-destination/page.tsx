import type { Metadata } from "next";
import { DestinationAdvisor } from "@/components/analyzers/destination-advisor";

export const metadata: Metadata = {
  title: "مراجعة وجهة — Destination review (preview)",
  description:
    "معاينة لقائمة مراجعة الوجهة؛ القائمة الفعلية غير مفعّلة بعد. Preview of a destination checklist; the real checklist is not enabled yet.",
  alternates: { canonical: "/analyze-destination" },
};

export default function Page() {
  return <DestinationAdvisor />;
}
