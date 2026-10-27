import { revalidatePath, revalidateTag } from "next/cache";
import { describeTikTokSetup, getTikTokConfig, getTikTokStoreConfig } from "@/lib/tiktok/config";
import { handleTikTokCallback } from "@/lib/tiktok/connect";
import { TIKTOK_VIDEOS_TAG } from "@/lib/tiktok/latest-videos";
import { UpstashTikTokStore } from "@/lib/tiktok/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const config = getTikTokConfig();
  const storeConfig = getTikTokStoreConfig();
  if (!config || !storeConfig) console.warn(`[tiktok] callback is off; ${describeTikTokSetup()}`);
  return handleTikTokCallback(
    request,
    { config, store: storeConfig ? new UpstashTikTokStore(storeConfig) : null },
    () => {
      revalidateTag(TIKTOK_VIDEOS_TAG);
      revalidatePath("/");
    }
  );
}
