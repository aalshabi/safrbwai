import { describeTikTokSetup, getTikTokConfig } from "@/lib/tiktok/config";
import { handleTikTokConnect } from "@/lib/tiktok/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const config = getTikTokConfig();
  if (!config) console.warn(`[tiktok] connect is off; ${describeTikTokSetup()}`);
  return handleTikTokConnect(request, config);
}
