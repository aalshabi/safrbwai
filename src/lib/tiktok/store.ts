import type { TikTokStoreConfig } from "./config";

export const REFRESH_TOKEN_KEY = "tiktok:refresh_token";
export const VIDEOS_KEY = "tiktok:videos";

export interface TikTokStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Upstash Redis over its REST API: one command per request, no client library. */
export class UpstashTikTokStore implements TikTokStore {
  constructor(
    private readonly config: TikTokStoreConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 5_000
  ) {}

  async get(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.command(["SET", key, value]);
  }

  private async command(args: string[]): Promise<unknown> {
    const response = await this.fetchImpl(this.config.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.config.token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!response.ok || body.error) throw new Error(`Upstash ${args[0]} failed with status ${response.status}`);
    return body.result ?? null;
  }
}
