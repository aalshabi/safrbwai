import type { Metadata } from "next";
import { PREVIEW_PAGE_ROBOTS } from "@/lib/seo";
import { KnowledgeEngine } from "@/components/knowledge-engine";

export const metadata: Metadata = {
  title: "معاينة محتوى السفر — Travel content preview",
  description:
    "معاينة لمحتوى محلي أولي غير منشور؛ لا تستخدم مصادر مباشرة أو بحثًا دلاليًا. Preview of unpublished local content without live sources or semantic search.",
  robots: PREVIEW_PAGE_ROBOTS,
  alternates: { canonical: "/knowledge" },
};

export default function Page() {
  return <KnowledgeEngine />;
}
