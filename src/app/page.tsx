import { Hero } from "@/components/home/hero";
import { Benefits } from "@/components/home/benefits";
import { Journey } from "@/components/home/journey";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pillars } from "@/components/home/pillars";
import { CTA } from "@/components/home/cta";
import { LatestInsights } from "@/components/home/latest-insights";
import { SocialHighlights } from "@/components/home/social-highlights";
import { getLatestInsights } from "@/lib/travel-insights";
import { getCachedTikTokStrip } from "@/lib/tiktok/latest-videos";
import { getCachedXStrip } from "@/lib/x/latest-posts";

// Neutral structured data for the travel-offer review tool.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SafrBwai — سافر بوعي",
  description:
    "A tool that helps travelers review information stated in travel offers before booking.",
  inLanguage: ["ar", "en"],
};

// The social strips read their weekly selections; the page is rebuilt at most every 12 hours.
export const revalidate = 43200;

export default async function HomePage() {
  const insights = getLatestInsights(3);
  const [tiktok, x] = await Promise.all([getCachedTikTokStrip(), getCachedXStrip()]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      <Hero />
      <Journey />
      <Benefits />
      <LatestInsights insights={insights} />
      <SocialHighlights tiktok={tiktok} x={x} />
      <Features />
      <HowItWorks />
      <Pillars />
      <CTA />
    </>
  );
}
