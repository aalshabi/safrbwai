import { createInMemoryRateLimiter } from "@/lib/offer-pipeline/api/rate-limit";

/** Each link read makes outbound requests, so it is limited more tightly than analysis. */
export const readUrlRateLimiter = createInMemoryRateLimiter({ max: 6, windowMs: 60_000 });
