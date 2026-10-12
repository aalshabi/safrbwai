import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "سياسة الخصوصية — Privacy Policy",
  description: "سياسة خصوصية سافر بوعي وبحث هوية الفندق. SafrBwai privacy policy.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <LegalPage doc="privacy" />;
}
