import { ipAddress } from "@vercel/functions";
import type { RateLimiter } from "@/lib/offer-pipeline/api/rate-limit";
import { normalizeWhatsAppNumber } from "./phone";
import type { NewsletterStore } from "./store";

export const NEWSLETTER_MAX_BODY_BYTES = 1_024;

type Code = "BAD_REQUEST" | "INVALID_PHONE" | "CONSENT_REQUIRED" | "RATE_LIMIT_EXCEEDED" | "NEWSLETTER_DISABLED" | "UNAVAILABLE";
type Message = { ar: string; en: string };

const MESSAGES = {
  success: { ar: "تم اشتراكك. ستصلك النشرة على واتساب.", en: "You're subscribed. The newsletter will arrive on WhatsApp." },
  invalid: { ar: "تعذّر قراءة الطلب.", en: "The request could not be read." },
  phone: { ar: "اكتب رقم جوال صحيحًا، مثل 05XXXXXXXX أو برمز الدولة.", en: "Enter a valid mobile number, such as 05XXXXXXXX or with the country code." },
  consent: { ar: "يلزم الموافقة على استقبال النشرة على واتساب.", en: "Please agree to receive the newsletter on WhatsApp." },
  rateLimited: { ar: "محاولات كثيرة خلال وقت قصير. حاول بعد قليل.", en: "Too many attempts. Try again shortly." },
  disabled: { ar: "الاشتراك في النشرة غير متاح حاليًا.", en: "Newsletter signup is not available right now." },
  unavailable: { ar: "تعذّر إتمام الاشتراك الآن. حاول مرة أخرى لاحقًا.", en: "Signup could not be completed now. Try again later." },
} as const;

function json(status: number, body: { ok: true; message: Message } | { ok: false; error: { code: Code; message: Message } }, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
const fail = (status: number, code: Code, message: Message, headers?: Record<string, string>) =>
  json(status, { ok: false, error: { code, message } }, headers);

function clientKey(request: Request): string {
  return (
    ipAddress(request) ||
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

interface Dependencies {
  store: NewsletterStore | null;
  rateLimiter: RateLimiter;
  now?: () => Date;
}

/**
 * POST { phone, consent: true, website: "" }. `website` is a hidden honeypot:
 * a filled one is answered as success and dropped. The phone number is never
 * logged.
 */
export function createNewsletterHandler({ store, rateLimiter, now = () => new Date() }: Dependencies) {
  return async function handleNewsletter(request: Request): Promise<Response> {
    if (!store) return fail(503, "NEWSLETTER_DISABLED", MESSAGES.disabled);

    const rate = rateLimiter.check(clientKey(request));
    if (!rate.allowed) {
      return fail(429, "RATE_LIMIT_EXCEEDED", MESSAGES.rateLimited, { "retry-after": String(rate.retryAfterSeconds) });
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return fail(400, "BAD_REQUEST", MESSAGES.invalid);
    }

    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > NEWSLETTER_MAX_BODY_BYTES) return fail(400, "BAD_REQUEST", MESSAGES.invalid);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(400, "BAD_REQUEST", MESSAGES.invalid);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "BAD_REQUEST", MESSAGES.invalid);
    const { phone, consent, website, ...rest } = body as Record<string, unknown>;
    if (Object.keys(rest).length > 0 || typeof phone !== "string") return fail(400, "BAD_REQUEST", MESSAGES.invalid);

    if (typeof website === "string" && website.trim() !== "") return json(200, { ok: true, message: MESSAGES.success });
    if (consent !== true) return fail(400, "CONSENT_REQUIRED", MESSAGES.consent);
    const normalized = normalizeWhatsAppNumber(phone);
    if (!normalized) return fail(400, "INVALID_PHONE", MESSAGES.phone);

    try {
      await store.subscribe(normalized, now());
    } catch {
      console.error(JSON.stringify({ event: "newsletter_signup_failed" }));
      return fail(502, "UNAVAILABLE", MESSAGES.unavailable);
    }
    return json(200, { ok: true, message: MESSAGES.success });
  };
}
