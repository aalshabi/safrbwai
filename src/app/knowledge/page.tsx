import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { PREVIEW_PAGE_ROBOTS } from "@/lib/seo";
import { KnowledgeEngine } from "@/components/knowledge-engine";

export const metadata: Metadata = pageMetadata({
  title: "معاينة محتوى السفر — Travel content preview",
  description:
    "معاينة لمحتوى محلي أولي غير منشور؛ لا تستخدم مصادر مباشرة أو بحثًا دلاليًا. Preview of unpublished local content without live sources or semantic search.",
  path: "/knowledge",
  image: "site",
  robots: PREVIEW_PAGE_ROBOTS,
});

export default function Page() {
  return <KnowledgeEngine />;
}
