import type { Metadata, Viewport } from "next";
import { Tajawal, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SITE_ROBOTS } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

const display = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "سافر بوعي — SafrBwai | قبل لا تدفع، افهم قرار سفرك",
    template: "%s | سافر بوعي",
  },
  description:
    "سافر بوعي أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز. SafrBwai helps you review the information stated in travel offers and make a clearer decision before booking.",
  keywords: [
    "سافر بوعي",
    "SafrBwai",
    "تحليل عرض سفر نصي",
    "قرار السفر",
    "مراجعة عرض السفر",
    "travel decisions",
    "text travel offer",
    "rule-based analysis",
  ],
  authors: [{ name: "سافر بوعي" }],
  creator: "سافر بوعي",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    alternateLocale: "en_US",
    url: SITE_URL,
    title: "سافر بوعي — SafrBwai",
    description:
      "أداة لمراجعة المعلومات الواردة في عروض السفر قبل الحجز. A tool for reviewing information stated in travel offers before booking.",
    siteName: "SafrBwai",
  },
  twitter: {
    card: "summary_large_image",
    title: "سافر بوعي — SafrBwai",
    description:
      "أداة لمراجعة المعلومات الواردة في عروض السفر قبل الحجز. A tool for reviewing information stated in travel offers before booking.",
  },
  robots: SITE_ROBOTS,
  alternates: {
    canonical: "/",
    languages: {
      ar: "/",
      en: "/",
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1B3A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} font-sans`}>
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
