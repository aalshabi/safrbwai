import type { Metadata } from "next";
import { KnowledgeEngine } from "@/components/knowledge-engine";

export const metadata: Metadata = {
  title: "مكتبة معرفة السفر — Travel knowledge library (preview)",
  description:
    "معاينة قبل الإطلاق: عناوين مختصرة عن الفنادق والوجهات ونصائح السفر والتأشيرات والطيران، قابلة للبحث. المقالات الكاملة لم تُكتب بعد. Pre-launch preview: short searchable headings on hotels, destinations, travel tips, visas and flights. The full guides are not written yet.",
  alternates: { canonical: "/knowledge" },
};

export default function Page() {
  return <KnowledgeEngine />;
}
