import type { Locale } from "@/lib/i18n/config";

type Localized = Readonly<Record<Locale, string>>;

export type SocialPlatform = "tiktok" | "x";

export type SocialHighlight = Readonly<{
  id: string;
  platform: SocialPlatform;
  title: Localized;
  description: Localized;
  action: Localized;
  href: string;
  label?: Localized;
}>;

export const SOCIAL_PROFILES: Readonly<Record<SocialPlatform, string>> = {
  tiktok: "https://www.tiktok.com/@safrbwai",
  x: "https://x.com/SafrBwai",
};

export const SOCIAL_HIGHLIGHTS: Readonly<Record<SocialPlatform, readonly SocialHighlight[]>> = {
  tiktok: [
    {
      id: "destination-experiences",
      platform: "tiktok",
      title: { ar: "تجارب الوجهات قبل الترشيح", en: "Destinations tested before recommending" },
      description: {
        ar: "مشاهد وتجارب واقعية تساعدك على تكوين صورة أوضح عن الوجهة قبل التخطيط.",
        en: "Real scenes and experiences that give you a clearer view of a destination before planning.",
      },
      action: { ar: "تصفح الفيديوهات", en: "Browse videos" },
      href: SOCIAL_PROFILES.tiktok,
      label: { ar: "من الحساب الرسمي", en: "From the official account" },
    },
    {
      id: "hotel-experiences",
      platform: "tiktok",
      title: { ar: "تجارب الفنادق كما هي", en: "Hotel experiences as they are" },
      description: {
        ar: "ملاحظات عملية عن الفندق والموقع والتجربة بعيدًا عن الصور التسويقية وحدها.",
        en: "Practical notes on the hotel, location, and stay beyond marketing photos alone.",
      },
      action: { ar: "تصفح الفيديوهات", en: "Browse videos" },
      href: SOCIAL_PROFILES.tiktok,
      label: { ar: "من الحساب الرسمي", en: "From the official account" },
    },
    {
      id: "travel-tips",
      platform: "tiktok",
      title: { ar: "نصائح من مسافر لمسافر", en: "Traveler-to-traveler advice" },
      description: {
        ar: "اختصارات وتنبيهات تساعدك على تقليل الأخطاء والتكاليف غير المتوقعة.",
        en: "Short tips and alerts that help reduce mistakes and unexpected costs.",
      },
      action: { ar: "تصفح الفيديوهات", en: "Browse videos" },
      href: SOCIAL_PROFILES.tiktok,
      label: { ar: "من الحساب الرسمي", en: "From the official account" },
    },
  ],
  x: [
    {
      id: "thailand-2026-guide",
      platform: "x",
      title: { ar: "دليل تايلاند 2026", en: "Thailand 2026 guide" },
      description: {
        ar: "دليل للعائلات والعرسان والميزانية المحدودة، مع أخطاء مكلفة ينبغي تجنبها.",
        en: "A guide for families, couples, and budget trips, including costly mistakes to avoid.",
      },
      action: { ar: "فتح الموضوع الأصلي", en: "Open original thread" },
      href: "https://x.com/SafrBwai/status/2050941925461529038",
      label: { ar: "موضوع مثبت", en: "Pinned thread" },
    },
    {
      id: "karakoy-autumn",
      platform: "x",
      title: { ar: "كاراكوي في الخريف والمطر", en: "Karaköy in autumn rain" },
      description: {
        ar: "لقطة من أجواء كاراكوي في إسطنبول عندما يغيّر الخريف والمطر تجربة المكان.",
        en: "A glimpse of Karaköy in Istanbul when autumn and rain change the feel of the area.",
      },
      action: { ar: "فتح المنشور الأصلي", en: "Open original post" },
      href: "https://x.com/SafrBwai/status/2106058301876097401",
    },
    {
      id: "kerala-thread",
      platform: "x",
      title: { ar: "كيرلا: وجهة تجمع أكثر من تجربة", en: "Kerala: several experiences in one trip" },
      description: {
        ar: "موضوع يجمع ملامح الوجهة وتجاربها لمساعدة المسافر على فهمها قبل بناء البرنامج.",
        en: "A thread that brings together the destination's different experiences before itinerary planning.",
      },
      action: { ar: "فتح الموضوع الأصلي", en: "Open original thread" },
      href: "https://x.com/SafrBwai/status/2085437614832939399",
      label: { ar: "ثريد سفر", en: "Travel thread" },
    },
  ],
};

