import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "الشروط والأحكام — Terms & Conditions",
  description: "شروط استخدام سافر بوعي وبيانات الفنادق الرسمية. SafrBwai terms of use.",
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <LegalPage doc="terms" />;
}
