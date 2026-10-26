import { revalidatePath } from "next/cache";
import { getTikTokConfig, getTikTokStoreConfig } from "@/lib/tiktok/config";
import { handleTikTokCallback } from "@/lib/tiktok/connect";
import { UpstashTikTokStore } from "@/lib/tiktok/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const storeConfig = getTikTokStoreConfig();
  return handleTikTokCallback(
    request,
    { config: getTikTokConfig(), store: storeConfig ? new UpstashTikTokStore(storeConfig) : null },
    () => revalidatePath("/")
  );
}
