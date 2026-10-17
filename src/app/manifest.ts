import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سافر بوعي — SafrBwai",
    short_name: "سافر بوعي",
    description: "أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0D1B3A",
    theme_color: "#0D1B3A",
    lang: "ar",
    dir: "rtl",
    categories: ["travel"],
    // PNG icons let Android and desktop browsers offer "Install" / "Add to
    // Home screen"; the maskable one keeps the mark inside the safe zone when
    // the launcher crops it to a circle or squircle.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
