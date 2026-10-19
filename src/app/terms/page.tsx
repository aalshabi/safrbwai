import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = pageMetadata({
  title: "الشروط والأحكام — Terms & Conditions",
  description:
    "شروط استخدام سافر بوعي وبيانات الفنادق الرسمية. SafrBwai terms of use.",
  path: "/terms",
  image: "site",
});

export default function Page() {
  return <LegalPage doc="terms" />;
}
