import { createInMemoryRateLimiter } from "@/lib/offer-pipeline/api/rate-limit";
import { getWatiConfig } from "@/lib/newsletter/config";
import { createNewsletterHandler } from "@/lib/newsletter/handler";
import { WatiNewsletterStore } from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const config = getWatiConfig();

export const POST = createNewsletterHandler({
  store: config ? new WatiNewsletterStore(config) : null,
  rateLimiter: createInMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 }),
});
