"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, MessageCircle, Play, Sparkles } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { useLanguage } from "@/lib/i18n/provider";
import {
  MAX_HIGHLIGHTS,
  SOCIAL_HIGHLIGHTS,
  SOCIAL_PROFILES,
  X_EMBED_ORIGIN,
  tiktokPlayerUrl,
  tiktokVideoId,
  xEmbedHeight,
  xEmbedUrl,
  xPostId,
  type SocialHighlight,
  type SocialPlatform,
} from "@/lib/social-highlights";
import type { SocialStrip } from "@/lib/social/selection";
import { cn } from "@/lib/utils";

const PLATFORM_STYLES: Readonly<Record<SocialPlatform, {
  accent: string;
  card: string;
  icon: typeof Play;
}>> = {
  tiktok: {
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    card: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
    icon: Play,
  },
  x: {
    accent: "text-foreground",
    card: "hover:border-slate-400 dark:hover:border-slate-600",
    icon: MessageCircle,
  },
};

const CARD_BODY = "flex flex-col rounded-3xl border bg-background p-6 shadow-sm transition duration-200";
/** One post per slot, four to a row on wide screens (X's embed lays out from 250px). */
const SLOT = "w-[82vw] max-w-sm shrink-0 snap-start sm:w-[290px] lg:w-[calc((100%-3rem)/4)]";
/** Both platforms' posts share one height so a row lines up. */
const POST_HEIGHT = 460;

/**
 * True once the element is near the viewport. The platform embeds mount only
 * then, so a visitor who never scrolls to this section loads nothing from them.
 */
function useNearViewport<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
}

const FRAME_PROPS = {
  sandbox: "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation",
  allow: "encrypted-media; fullscreen; picture-in-picture",
  referrerPolicy: "strict-origin-when-cross-origin",
} as const;


/**
 * X's own post embed, so the card looks and works as it does on X. It stays
 * invisible over our fallback card until X's first resize message says it
 * rendered; a blocked or failed embed leaves the fallback in place.
 */
function XEmbedSlot({ src, title, href, fallback }: {
  src: string;
  title: string;
  href: string;
  fallback: React.ReactNode;
}) {
  const { locale } = useLanguage();
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [rendered, setRendered] = React.useState<number | null>(null);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== X_EMBED_ORIGIN || event.source !== ref.current?.contentWindow) return;
      const next = xEmbedHeight(event.data);
      if (next) setRendered(Math.max(next, 200));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const ready = rendered !== null;
  const cut = ready && rendered > POST_HEIGHT;

  return (
    <div className={cn("relative", SLOT)}>
      {ready ? null : fallback}
      <iframe
        ref={ref}
        src={src}
        title={title}
        aria-hidden={ready ? undefined : true}
        tabIndex={ready ? undefined : -1}
        // A cut post would otherwise show its own scrollbar; the fade links to the full post.
        scrolling="no"
        style={{ height: ready ? Math.min(rendered, POST_HEIGHT) : 560 }}
        className={cn(
          "w-full rounded-2xl border-0 bg-transparent",
          !ready && "pointer-events-none absolute inset-x-0 top-0 opacity-0"
        )}
        {...FRAME_PROPS}
      />
      {cut ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-28 items-end justify-center rounded-b-2xl bg-gradient-to-t from-background via-background/90 to-transparent pb-2">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-bold shadow-sm hover:underline"
          >
            {locale === "ar" ? "اقرأ المنشور كاملًا على X" : "Read the full post on X"}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      ) : null}
    </div>
  );
}

/** Our own card: shown until the embed mounts, and the content if it never does. */
function HighlightCard({ highlight, fill = false }: { highlight: SocialHighlight; fill?: boolean }) {
  const { locale } = useLanguage();
  const styles = PLATFORM_STYLES[highlight.platform];
  const PlatformIcon = styles.icon;
  const action = highlight.action[locale];

  return (
    <article className={cn(CARD_BODY, fill ? "w-full" : SLOT, styles.card)}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("inline-flex size-10 items-center justify-center rounded-2xl bg-muted", styles.accent)}>
          <PlatformIcon className="size-5" aria-hidden />
        </span>
        {highlight.label ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
            {highlight.label[locale]}
          </span>
        ) : null}
      </div>
      <h3 className="mt-6 font-display text-xl font-extrabold leading-8">{highlight.title[locale]}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{highlight.description[locale]}</p>
      <a
        href={highlight.href}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:underline"
        aria-label={`${highlight.title[locale]} — ${action}`}
      >
        {action}
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </article>
  );
}

function XPost({ highlight, load }: { highlight: SocialHighlight; load: boolean }) {
  const { locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const postId = xPostId(highlight.href);
  if (!postId || !load) return <HighlightCard highlight={highlight} />;
  return (
    <XEmbedSlot
      src={xEmbedUrl(postId, locale, resolvedTheme === "dark" ? "dark" : "light")}
      title={highlight.title[locale]}
      href={highlight.href}
      fallback={<HighlightCard highlight={highlight} fill />}
    />
  );
}

/**
 * One TikTok video in TikTok's own player, the same size as an X post. TikTok
 * posts no "rendered" message, so the player shows as soon as it mounts, with
 * the link to the video kept under it.
 */
function TikTokVideo({ highlight, load }: { highlight: SocialHighlight; load: boolean }) {
  const { locale } = useLanguage();
  const videoId = tiktokVideoId(highlight.href);
  if (!videoId || !load) return <HighlightCard highlight={highlight} />;
  return (
    <div className={SLOT}>
      <iframe
        src={tiktokPlayerUrl(videoId)}
        title={highlight.title[locale]}
        style={{ height: POST_HEIGHT }}
        className="w-full rounded-2xl border border-border bg-black"
        {...FRAME_PROPS}
      />
      <a
        href={highlight.href}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:underline"
        aria-label={`${highlight.title[locale]} — ${highlight.action[locale]}`}
      >
        {highlight.action[locale]}
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  );
}

const ACCOUNT_HANDLE: Readonly<Record<SocialPlatform, string>> = { tiktok: "@safrbwai", x: "@SafrBwai" };

/** The platform's own look for its badge: TikTok's black with cyan/pink edges, X's black and white. */
const PLATFORM_BADGE: Readonly<Record<SocialPlatform, string>> = {
  tiktok: "bg-black text-white shadow-[-2px_-2px_0_#25F4EE,2px_2px_0_#FE2C55]",
  x: "bg-black text-white dark:bg-white dark:text-black",
};

function formatDate(iso: string, locale: "ar" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** What the selection is, in plain words: hand-picked, or ranked by which metric over which range. */
function selectionNote(platform: SocialPlatform, strip: SocialStrip, locale: "ar" | "en"): string {
  if (strip.source === "manual" || !strip.poolSize) {
    return locale === "ar" ? "مختارات من الحساب" : "Picks from the account";
  }
  const date = strip.refreshedAt ? formatDate(strip.refreshedAt, locale) : null;
  const n = strip.poolSize;
  if (platform === "tiktok") {
    return locale === "ar"
      ? `الأكثر مشاهدة بين آخر ${n} فيديو في الحساب (حسب مشاهدات تيك توك)${date ? ` · آخر تحديث ${date}` : ""}`
      : `Most viewed of the account's latest ${n} videos (TikTok views)${date ? ` · updated ${date}` : ""}`;
  }
  return locale === "ar"
    ? `الأعلى ظهورًا بين آخر ${n} منشور أصلي في الحساب (مرات الظهور كما يقيسها X، وهي غير مشاهدات الفيديو)${date ? ` · آخر تحديث ${date}` : ""}`
    : `Highest impressions among the account's latest ${n} original posts (X impressions, not video views)${date ? ` · updated ${date}` : ""}`;
}

function HighlightStrip({ platform, strip }: { platform: SocialPlatform; strip: SocialStrip }) {
  const { locale } = useLanguage();
  const styles = PLATFORM_STYLES[platform];
  const PlatformIcon = styles.icon;
  const copy = platform === "tiktok"
    ? locale === "ar"
      ? { title: "سافر بوعي على تيك توك", profile: "فتح الحساب على تيك توك", prev: "الفيديو السابق", next: "الفيديو التالي" }
      : { title: "SafrBwai on TikTok", profile: "Open the TikTok account", prev: "Previous video", next: "Next video" }
    : locale === "ar"
      ? { title: "سافر بوعي على X", profile: "فتح الحساب على X", prev: "المنشور السابق", next: "المنشور التالي" }
      : { title: "SafrBwai on X", profile: "Open the X account", prev: "Previous post", next: "Next post" };

  const [stripRef, near] = useNearViewport<HTMLDivElement>();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const highlights = strip.items.slice(0, MAX_HIGHLIGHTS);

  const step = React.useCallback((direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.firstElementChild as HTMLElement | null;
    const width = (card?.offsetWidth ?? scroller.clientWidth) + 16;
    // "Next" moves toward the end of the row: leftward in Arabic (RTL), rightward in English.
    const rtl = getComputedStyle(scroller).direction === "rtl";
    scroller.scrollBy({ left: direction * width * (rtl ? -1 : 1), behavior: "smooth" });
  }, []);

  if (highlights.length === 0) return null;
  const titleId = `social-strip-${platform}`;

  return (
    <div ref={stripRef} className="mt-12 first:mt-0" role="group" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-extrabold", PLATFORM_BADGE[platform])}>
              <PlatformIcon className="size-4" aria-hidden />
              {platform === "tiktok" ? "TikTok" : "X"}
            </span>
            <span dir="ltr" className="text-muted-foreground">{ACCOUNT_HANDLE[platform]}</span>
          </p>
          <h3 id={titleId} className="mt-3 font-display text-2xl font-extrabold md:text-3xl">{copy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectionNote(platform, strip, locale)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={SOCIAL_PROFILES[platform]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal hover:underline"
          >
            {copy.profile}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
          </a>
          {highlights.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={copy.prev}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background hover:bg-muted"
              >
                <ChevronRight className="size-5 ltr:rotate-180" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label={copy.next}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background hover:bg-muted"
              >
                <ChevronLeft className="size-5 ltr:rotate-180" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label={copy.title}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(rtl ? 1 : -1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(rtl ? -1 : 1);
          }
        }}
        className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {highlights.map((highlight) =>
          platform === "tiktok" ? (
            <TikTokVideo key={highlight.id} highlight={highlight} load={near} />
          ) : (
            <XPost key={highlight.id} highlight={highlight} load={near} />
          )
        )}
      </div>
    </div>
  );
}

const MANUAL = (platform: SocialPlatform): SocialStrip => ({ items: [...SOCIAL_HIGHLIGHTS[platform]], source: "manual" });

/** Each strip is its weekly selection, read on the server; without one it is the hand-picked list. */
export function SocialHighlights({ tiktok = MANUAL("tiktok"), x = MANUAL("x") }: { tiktok?: SocialStrip; x?: SocialStrip }) {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        eyebrow: "من قنوات سافر بوعي",
        title: "شاهد الفكرة بسرعة، ثم احفظ التفاصيل",
        subtitle: "منشورات حسابَي سافر بوعي على تيك توك وX، معروضة بالتضمين الرسمي لكل منصة. سافر بوعي غير مرتبط بتيك توك أو X بأي شراكة.",
      }
    : {
        eyebrow: "From SafrBwai channels",
        title: "Watch the idea, then save the details",
        subtitle: "Posts from SafrBwai's TikTok and X accounts, shown with each platform's official embed. SafrBwai has no partnership with TikTok or X.",
      };

  return (
    <section className="section overflow-hidden" aria-labelledby="social-highlights-title">
      <div className="container">
        <Reveal className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-teal">
            <Sparkles className="size-4" aria-hidden />
            {copy.eyebrow}
          </p>
          <h2 id="social-highlights-title" className="mt-3 font-display text-3xl font-extrabold md:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">{copy.subtitle}</p>
        </Reveal>

        <Reveal className="mt-12">
          <HighlightStrip platform="tiktok" strip={tiktok} />
          <HighlightStrip platform="x" strip={x} />
        </Reveal>
      </div>
    </section>
  );
}

