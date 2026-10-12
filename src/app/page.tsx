import { Hero } from "@/components/home/hero";
import { Benefits } from "@/components/home/benefits";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { Pillars } from "@/components/home/pillars";
import { CTA } from "@/components/home/cta";
import { ProductStageNotice } from "@/components/shared/product-stage-notice";

// Neutral structured data for the travel-offer review tool.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SafrBwai — سافر بوعي",
  description:
    "A tool that helps travelers review information stated in travel offers before booking.",
  inLanguage: ["ar", "en"],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOME_JSON_LD) }}
      />
      <Hero />
      <div className="container pt-8">
        <ProductStageNotice />
      </div>
      <Benefits />
      <Features />
      <HowItWorks />
      <Pillars />
      <CTA />
    </>
  );
}
