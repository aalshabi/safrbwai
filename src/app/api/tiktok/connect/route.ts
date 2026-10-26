import { getTikTokConfig } from "@/lib/tiktok/config";
import { handleTikTokConnect } from "@/lib/tiktok/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleTikTokConnect(request, getTikTokConfig());
}
