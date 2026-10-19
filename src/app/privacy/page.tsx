import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "سياسة الخصوصية — Privacy Policy",
  description:
    "سياسة خصوصية سافر بوعي وبحث هوية الفندق. SafrBwai privacy policy.",
  path: "/privacy",
  image: "site",
});

export default function Page() {
  return <LegalPage doc="privacy" />;
}
