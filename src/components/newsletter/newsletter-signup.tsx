"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  ar: {
    title: "آخر مواضيع مرصد السفر على واتساب",
    subtitle: "نرسل لك المواضيع الجديدة حين تُنشر. رقمك لا يُشارك مع أي جهة أخرى، وتلغي الاشتراك متى شئت.",
    label: "رقم الجوال",
    placeholder: "05XXXXXXXX",
    consent: "أوافق على استقبال نشرة سافر بوعي على واتساب. أستطيع إلغاء الاشتراك بالرد «إلغاء».",
    privacy: "سياسة الخصوصية",
    submit: "اشترك",
    sending: "جارٍ الاشتراك…",
    failed: "تعذّر إتمام الاشتراك الآن. حاول مرة أخرى لاحقًا.",
  },
  en: {
    title: "Latest Travel Monitor stories on WhatsApp",
    subtitle: "We send new stories when they are published. Your number is not shared with anyone, and you can unsubscribe at any time.",
    label: "Mobile number",
    placeholder: "+966 5X XXX XXXX",
    consent: "I agree to receive the SafrBwai newsletter on WhatsApp. I can unsubscribe by replying «إلغاء».",
    privacy: "Privacy Policy",
    submit: "Subscribe",
    sending: "Subscribing…",
    failed: "Signup could not be completed now. Try again later.",
  },
} as const;

type Status = { kind: "idle" | "sending" } | { kind: "done" | "error"; message: string };

/** Rendered only when the server has the newsletter enabled (see isNewsletterEnabled). */
export function NewsletterSignup() {
  const { locale } = useLanguage();
  const copy = COPY[locale];
  const id = useId();
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, consent, website }),
      });
      const body = (await response.json()) as { ok: boolean; message?: Record<string, string>; error?: { message: Record<string, string> } };
      if (body.ok) {
        setStatus({ kind: "done", message: body.message?.[locale] ?? "" });
        setPhone("");
      } else {
        setStatus({ kind: "error", message: body.error?.message[locale] ?? copy.failed });
      }
    } catch {
      setStatus({ kind: "error", message: copy.failed });
    }
  }

  return (
    <section className="mt-14 rounded-2xl border border-teal/30 bg-teal/5 p-6 md:p-8" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="flex items-center gap-2 font-display text-xl font-extrabold">
        <MessageCircle className="size-5 text-teal" aria-hidden />
        {copy.title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{copy.subtitle}</p>

      {status.kind === "done" ? (
        <p className="mt-5 font-bold text-teal" role="status">{status.message}</p>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <label className="flex items-start gap-2 text-sm leading-6">
            <input type="checkbox" className="mt-1 size-4 accent-teal" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {copy.consent}{" "}
              <Link href="/privacy" className="text-teal underline underline-offset-4">{copy.privacy}</Link>
            </span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor={`${id}-phone`} className="sr-only">{copy.label}</label>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              required
              placeholder={copy.placeholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={status.kind === "sending" || !consent || phone.trim() === ""}>
              {status.kind === "sending" ? copy.sending : copy.submit}
            </Button>
          </div>
          {/* Honeypot: hidden from people, filled by bots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          {status.kind === "error" && <p className="text-sm font-bold text-destructive" role="alert">{status.message}</p>}
        </form>
      )}
    </section>
  );
}
