import { isServerHotelIdentityLookupEnabled } from "@/lib/hotel-data/config";
import { createConfiguredGooglePlacesHotelProvider } from "@/lib/hotel-data/google-places";
import { createHotelNameHandler } from "@/lib/hotel-data/handler";
import { hotelSearchRateLimiter } from "@/lib/hotel-data/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createHotelNameHandler({
  enabled: isServerHotelIdentityLookupEnabled(),
  providerFactory: createConfiguredGooglePlacesHotelProvider,
  rateLimiter: hotelSearchRateLimiter,
});
