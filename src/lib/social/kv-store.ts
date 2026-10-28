/** Where the social strips keep tokens and their last weekly selection (Upstash Redis REST). */
export type KvStoreConfig = { url: string; token: string };

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Reads the variables the Vercel Upstash integration adds (KV_REST_API_*), or Upstash's own names. */
export function getKvStoreConfig(env: Record<string, string | undefined> = process.env): KvStoreConfig | null {
  const url = (env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL)?.trim().replace(/\/+$/, "");
  const token = (env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN)?.trim();
  if (!url?.startsWith("https://") || !token) return null;
  return { url, token };
}

/** Upstash Redis over its REST API: one command per request, no client library. */
export class UpstashKeyValueStore implements KeyValueStore {
  constructor(
    private readonly config: KvStoreConfig,
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
