export {
  UpstashKeyValueStore as UpstashTikTokStore,
  type KeyValueStore as TikTokStore,
} from "@/lib/social/kv-store";

export const REFRESH_TOKEN_KEY = "tiktok:refresh_token";
/** The weekly ranked selection (RankedSnapshot<TikTokVideo>). */
export const VIDEOS_KEY = "tiktok:videos";
