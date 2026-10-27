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

/**
 * Each strip shows up to four posts, four to a row on wide screens. TikTok
 * entries are individual videos (https://www.tiktok.com/@safrbwai/video/<id>),
 * never the account page; a strip with no posts is not shown.
 */
export const MAX_HIGHLIGHTS = 4;

export const SOCIAL_HIGHLIGHTS: Readonly<Record<SocialPlatform, readonly SocialHighlight[]>> = {
  tiktok: [],
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


/**
 * Official embeds, mounted only when the visitor reaches the section: nothing
 * is fetched from X or TikTok while the page above it is being read.
 */
export const X_EMBED_ORIGIN = "https://platform.twitter.com";
export const TIKTOK_EMBED_ORIGIN = "https://www.tiktok.com";

const X_POST = /^https:\/\/x\.com\/SafrBwai\/status\/(\d+)$/;

export function xPostId(href: string): string | null {
  return X_POST.exec(href)?.[1] ?? null;
}

const TIKTOK_VIDEO = /^https:\/\/www\.tiktok\.com\/@safrbwai\/video\/(\d+)$/;

export function tiktokVideoId(href: string): string | null {
  return TIKTOK_VIDEO.exec(href)?.[1] ?? null;
}

/** TikTok's official embed player for one video. */
export function tiktokPlayerUrl(id: string): string {
  return `${TIKTOK_EMBED_ORIGIN}/player/v1/${id}`;
}

export function xEmbedUrl(id: string, locale: Locale, theme: "light" | "dark"): string {
  const params = new URLSearchParams({ id, lang: locale, theme, dnt: "true" });
  return `${X_EMBED_ORIGIN}/embed/Tweet.html?${params}`;
}

/** Height from the resize message X's embed posts to its parent page, if that is what this is. */
export function xEmbedHeight(data: unknown): number | null {
  let message = data;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch {
      return null;
    }
  }
  const embed = (message as { "twttr.embed"?: { method?: unknown; params?: unknown } } | null)?.["twttr.embed"];
  if (!embed || embed.method !== "twttr.private.resize" || !Array.isArray(embed.params)) return null;
  const height = (embed.params[0] as { height?: unknown } | undefined)?.height;
  return typeof height === "number" && Number.isFinite(height) && height > 0 ? Math.ceil(height) : null;
}
