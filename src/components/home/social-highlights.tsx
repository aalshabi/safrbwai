"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, ExternalLink, MessageCircle, Play, Sparkles } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { useLanguage } from "@/lib/i18n/provider";
import {
  SOCIAL_HIGHLIGHTS,
  SOCIAL_PROFILES,
  TIKTOK_PROFILE_EMBED,
  X_EMBED_ORIGIN,
  xEmbedHeight,
  xEmbedUrl,
  xPostId,
  type SocialHighlight,
  type SocialPlatform,
} from "@/lib/social-highlights";
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
const EMBED_SLOT = "w-[82vw] max-w-sm shrink-0 snap-start sm:w-[340px]";
/** X posts: four to a row on wide screens (X's embed lays out from 250px). */
const X_SLOT = "w-[82vw] max-w-sm shrink-0 snap-start sm:w-[290px] lg:w-[calc((100%-3rem)/4)]";
const CARD = cn(CARD_BODY, EMBED_SLOT);

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

/** Tall posts (photo or video plus text) are cut here, with a fade and a link to the full post. */
const X_MAX_HEIGHT = 460;

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
  const cut = ready && rendered > X_MAX_HEIGHT;

  return (
    <div className={cn("relative", X_SLOT)}>
      {ready ? null : fallback}
      <iframe
        ref={ref}
        src={src}
        title={title}
        aria-hidden={ready ? undefined : true}
        tabIndex={ready ? undefined : -1}
        // A cut post would otherwise show its own scrollbar; the fade links to the full post.
        scrolling="no"
        style={{ height: ready ? Math.min(rendered, X_MAX_HEIGHT) : 560 }}
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
    <article className={cn(CARD_BODY, fill ? "w-full" : X_SLOT, styles.card)}>
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
 * TikTok's own account embed, shown as soon as it mounts (TikTok posts no
 * "rendered" message, and an embed kept invisible did not render), with the
 * link to the account always kept under it.
 */
function TikTokProfile({ load }: { load: boolean }) {
  const { locale } = useLanguage();
  const title = locale === "ar" ? "حساب سافر بوعي على تيك توك" : "SafrBwai on TikTok";
  const link = (
    <a
      href={SOCIAL_PROFILES.tiktok}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:underline"
    >
      {locale === "ar" ? "فتح الحساب على تيك توك" : "Open the account on TikTok"}
      <ExternalLink className="size-4" aria-hidden />
    </a>
  );
  if (!load) {
    return (
      <article className={cn(CARD, PLATFORM_STYLES.tiktok.card, "min-h-[640px]")}>
        <span className={cn("inline-flex size-10 items-center justify-center rounded-2xl bg-muted", PLATFORM_STYLES.tiktok.accent)}>
          <Play className="size-5" aria-hidden />
        </span>
        <h3 className="mt-6 font-display text-xl font-extrabold leading-8">{title}</h3>
        {link}
      </article>
    );
  }
  return (
    <div className={EMBED_SLOT}>
      <iframe
        src={TIKTOK_PROFILE_EMBED}
        title={title}
        style={{ height: 640 }}
        className="w-full rounded-2xl border border-border bg-background"
        {...FRAME_PROPS}
      />
      {link}
    </div>
  );
}

function HighlightStrip({ platform }: { platform: SocialPlatform }) {
  const { locale } = useLanguage();
  const styles = PLATFORM_STYLES[platform];
  const PlatformIcon = styles.icon;
  const copy = platform === "tiktok"
    ? locale === "ar"
      ? { title: "فيديوهات مختارة على تيك توك", subtitle: "تجارب ونصائح قصيرة من الحساب الرسمي.", profile: "زيارة حساب تيك توك" }
      : { title: "Selected videos on TikTok", subtitle: "Short experiences and advice from the official account.", profile: "Visit TikTok profile" }
    : locale === "ar"
      ? { title: "مواضيع مختارة على X", subtitle: "أدلة ومشاهد سفر تستحق الحفظ والعودة إليها.", profile: "زيارة حساب X" }
      : { title: "Selected posts on X", subtitle: "Travel guides and scenes worth saving for later.", profile: "Visit X profile" };

  const [stripRef, near] = useNearViewport<HTMLDivElement>();

  return (
    <div ref={stripRef} className="mt-12 first:mt-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={cn("inline-flex items-center gap-2 text-sm font-extrabold", styles.accent)}>
            <PlatformIcon className="size-4" aria-hidden />
            {platform === "tiktok" ? "TikTok" : "X"}
          </p>
          <h3 className="mt-2 font-display text-2xl font-extrabold md:text-3xl">{copy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
        </div>
        <a
          href={SOCIAL_PROFILES[platform]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal hover:underline"
        >
          {copy.profile}
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
        </a>
      </div>

      <div
        className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        aria-label={copy.title}
      >
        {platform === "tiktok" ? (
          <TikTokProfile load={near} />
        ) : (
          SOCIAL_HIGHLIGHTS.x.map((highlight) => <XPost key={highlight.id} highlight={highlight} load={near} />)
        )}
      </div>
    </div>
  );
}

export function SocialHighlights() {
  const { locale } = useLanguage();
  const copy = locale === "ar"
    ? {
        eyebrow: "من قنوات سافر بوعي",
        title: "شاهد الفكرة بسرعة، ثم احفظ التفاصيل",
        subtitle: "مختارات مباشرة من محتوى سافر بوعي على تيك توك وX، في مكان واحد.",
      }
    : {
        eyebrow: "From SafrBwai channels",
        title: "Watch the idea, then save the details",
        subtitle: "Highlights from SafrBwai on TikTok and X, collected in one place.",
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
          <HighlightStrip platform="tiktok" />
          <HighlightStrip platform="x" />
        </Reveal>
      </div>
    </section>
  );
}

