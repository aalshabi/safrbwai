/**
 * Airport-status providers. Each returns the raw feed; normalize.ts validates
 * it. Server-side only: the remote token is a plain (non-NEXT_PUBLIC) env var.
 */

import manualFeed from "./manual-feed.json";
import { sampleFeed } from "./fixtures";
import type { FeedMode } from "./types";

export interface AirportStatusProvider {
  readonly mode: Exclude<FeedMode, "unavailable">;
  /** True only for an authorized provider that delivers live data. */
  readonly live: boolean;
  readonly allowSamples: boolean;
  load(now: Date): Promise<unknown>;
}

export interface ProviderEnv {
  NODE_ENV?: string;
  AIRPORT_STATUS_FIXTURES?: string;
  AIRPORT_STATUS_FEED_URL?: string;
  AIRPORT_STATUS_FEED_TOKEN?: string;
  /** "authorized_api" for a licensed provider; anything else is a CMS export. */
  AIRPORT_STATUS_FEED_KIND?: string;
  /** "1" only when the authorized provider's licence covers live data. */
  AIRPORT_STATUS_FEED_LIVE?: string;
}

export const FEED_TIMEOUT_MS = 3000;
export const FEED_RETRIES = 1;
export const FEED_REVALIDATE_SECONDS = 300;
export const FEED_MAX_BYTES = 512 * 1024;

export class ManualStatusProvider implements AirportStatusProvider {
  readonly mode = "manual_feed" as const;
  readonly live = false;
  readonly allowSamples = false;
  constructor(private readonly feed: unknown = manualFeed) {}
  async load(): Promise<unknown> {
    return this.feed;
  }
}

export class FixtureProvider implements AirportStatusProvider {
  readonly mode = "fixture" as const;
  readonly live = false;
  readonly allowSamples = true;
  async load(now: Date): Promise<unknown> {
    return sampleFeed(now);
  }
}

class RetryableError extends Error {}

/** A licensed API or a CMS export at an https URL. */
export class RemoteFeedProvider implements AirportStatusProvider {
  readonly allowSamples = false;
  constructor(
    private readonly url: string,
    readonly mode: "authorized_api" | "cms_feed",
    readonly live: boolean,
    private readonly token?: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async load(): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= FEED_RETRIES; attempt++) {
      try {
        return await this.once();
      } catch (error) {
        lastError = error;
        if (!(error instanceof RetryableError)) break;
      }
    }
    throw lastError;
  }

  private async once(): Promise<unknown> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        headers,
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
        // An https feed must not be silently moved to another location or scheme.
        redirect: "error",
        next: { revalidate: FEED_REVALIDATE_SECONDS },
      } as RequestInit);
    } catch (error) {
      // A timeout is not retried: the page waits for this call, so the
      // worst case stays at one FEED_TIMEOUT_MS. Other network errors fail fast.
      if ((error as { name?: unknown } | null)?.name === "TimeoutError") throw new Error("timeout");
      throw new RetryableError(error instanceof Error ? error.message : "network error");
    }
    if (res.status >= 500) throw new RetryableError(`HTTP ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (Number(res.headers?.get("content-length") ?? 0) > FEED_MAX_BYTES) throw new Error("response too large");
    const body = await res.text();
    if (new TextEncoder().encode(body).byteLength > FEED_MAX_BYTES) throw new Error("response too large");
    try {
      return JSON.parse(body);
    } catch {
      throw new Error("invalid JSON");
    }
  }
}

export interface ProviderChoice {
  provider: AirportStatusProvider;
  /** Used when the primary provider fails and nothing good is held. */
  fallback: AirportStatusProvider | null;
  issues: string[];
}

export function selectProvider(env: ProviderEnv, fetchImpl?: typeof fetch, manual?: unknown): ProviderChoice {
  const manualProvider = new ManualStatusProvider(manual);
  if (env.AIRPORT_STATUS_FIXTURES === "1") {
    if (env.NODE_ENV !== "production") return { provider: new FixtureProvider(), fallback: null, issues: [] };
    // Fixtures are never served in production, whatever the flag says.
    return { provider: manualProvider, fallback: null, issues: ["fixtures: refused in production"] };
  }
  if (!env.AIRPORT_STATUS_FEED_URL) return { provider: manualProvider, fallback: null, issues: [] };
  let url: URL | null = null;
  try {
    url = new URL(env.AIRPORT_STATUS_FEED_URL);
  } catch {
    url = null;
  }
  if (!url || url.protocol !== "https:") {
    return { provider: manualProvider, fallback: null, issues: ["remote: AIRPORT_STATUS_FEED_URL must be an https URL; ignored"] };
  }
  const authorized = env.AIRPORT_STATUS_FEED_KIND === "authorized_api";
  const remote = new RemoteFeedProvider(
    url.toString(),
    authorized ? "authorized_api" : "cms_feed",
    authorized && env.AIRPORT_STATUS_FEED_LIVE === "1",
    env.AIRPORT_STATUS_FEED_TOKEN,
    fetchImpl
  );
  return { provider: remote, fallback: manualProvider, issues: [] };
}
