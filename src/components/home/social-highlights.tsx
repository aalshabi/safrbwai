"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, ExternalLink, MessageCircle, Play, Sparkles } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { Button } from "@/components/ui/button";
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

const CARD =
  "flex w-[82vw] max-w-sm shrink-0 snap-start flex-col rounded-3xl border bg-background p-6 shadow-sm transition duration-200 sm:w-[340px]";

/**
 * The platform's own player, mounted only after the visitor clicks: until then
 * the browser makes no request to X or TikTok.
 */
function EmbedFrame({ src, title, height, resizeOrigin, className }: {
  src: string;
  title: string;
  height: number;
  /** Origin whose resize messages may set the frame height (X posts them). */
  resizeOrigin?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [frameHeight, setFrameHeight] = React.useState(height);

  React.useEffect(() => {
    if (!resizeOrigin) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== resizeOrigin || event.source !== ref.current?.contentWindow) return;
      const next = xEmbedHeight(event.data);
      if (next) setFrameHeight(Math.min(Math.max(next, 200), 1400));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [resizeOrigin]);

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      style={{ height: frameHeight }}
      className={cn("w-full rounded-2xl border-0 bg-background", className)}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
      allow="encrypted-media; fullscreen; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

function EmbedNote({ platform }: { platform: SocialPlatform }) {
  const { locale } = useLanguage();
  const name = platform === "x" ? "X" : locale === "ar" ? "تيك توك" : "TikTok";
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      {locale === "ar"
        ? `يُحمَّل من ${name} عند الضغط، وتنطبق عليه سياستها.`
        : `Loads from ${name} when you tap, under its own policy.`}
    </p>
  );
}

function HighlightCard({ highlight }: { highlight: SocialHighlight }) {
  const { locale } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [showEmbed, setShowEmbed] = React.useState(false);
  const styles = PLATFORM_STYLES[highlight.platform];
  const PlatformIcon = styles.icon;
  const action = highlight.action[locale];
  const postId = highlight.platform === "x" ? xPostId(highlight.href) : null;

  return (
    <article className={cn(CARD, styles.card)}>
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

      <h3 className="mt-6 font-display text-xl font-extrabold leading-8">
        {highlight.title[locale]}
      </h3>

      {postId && showEmbed ? (
        <EmbedFrame
          src={xEmbedUrl(postId, locale, resolvedTheme === "dark" ? "dark" : "light")}
          title={highlight.title[locale]}
          height={560}
          resizeOrigin={X_EMBED_ORIGIN}
          // Reaches into the card padding: the post embed needs ~300px to lay out well.
          className="-mx-3 mt-5 w-[calc(100%+1.5rem)]"
        />
      ) : (
        <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
          {highlight.description[locale]}
        </p>
      )}

      {postId && !showEmbed ? (
        <div className="mt-5">
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowEmbed(true)}>
            <MessageCircle aria-hidden />
            {locale === "ar" ? "اعرض المنشور هنا" : "Show the post here"}
          </Button>
          <EmbedNote platform="x" />
        </div>
      ) : null}

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

/** The account's own TikTok profile embed, as wide as the page, under the strip heading. */
function TikTokProfilePanel() {
  const { locale } = useLanguage();
  const [showEmbed, setShowEmbed] = React.useState(false);
  const styles = PLATFORM_STYLES.tiktok;
  const copy = locale === "ar"
    ? {
        title: "أحدث فيديوهات الحساب",
        description: "شاهد فيديوهات سافر بوعي على تيك توك هنا دون مغادرة الموقع.",
        show: "اعرض الفيديوهات هنا",
      }
    : {
        title: "Latest videos from the account",
        description: "Watch SafrBwai's TikTok videos here without leaving the site.",
        show: "Show the videos here",
      };

  if (showEmbed) {
    return (
      <EmbedFrame
        src={TIKTOK_PROFILE_EMBED}
        title={copy.title}
        height={640}
        className="mt-6 border border-border"
      />
    );
  }

  return (
    <section
      aria-label={copy.title}
      className={cn("mt-6 flex flex-col gap-4 rounded-3xl border bg-background p-6 shadow-sm sm:flex-row sm:items-center", styles.card)}
    >
      <span className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted", styles.accent)}>
        <Play className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-lg font-extrabold">{copy.title}</h4>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy.description}</p>
      </div>
      <div className="sm:w-64">
        <Button type="button" variant="outline" className="w-full" onClick={() => setShowEmbed(true)}>
          <Play aria-hidden />
          {copy.show}
        </Button>
        <EmbedNote platform="tiktok" />
      </div>
    </section>
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

  return (
    <div className="mt-12 first:mt-0">
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

      {platform === "tiktok" ? <TikTokProfilePanel /> : null}

      <div
        className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
        aria-label={copy.title}
      >
        {SOCIAL_HIGHLIGHTS[platform].map((highlight) => (
          <HighlightCard key={highlight.id} highlight={highlight} />
        ))}
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

