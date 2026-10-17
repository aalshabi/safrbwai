/**
 * Server-side entry point: choose a provider, load, normalize, keep the last
 * good remote result. Import only from server components.
 *
 * Caching: the remote fetch uses Next's data cache (5 minutes). Once a good
 * response is cached, Next serves it and refreshes in the background, so an
 * outage shows up as aging records (rendered as stale) rather than as
 * `refreshFailed`. The page itself renders per request (see the loader).
 */

import { normalizeFeed } from "./normalize";
import { selectProvider, type AirportStatusProvider, type ProviderEnv } from "./providers";
import type { AirportStatusSnapshot } from "./types";

export interface ServiceOptions {
  now?: Date;
  env?: ProviderEnv;
  fetchImpl?: typeof fetch;
  manual?: unknown;
}

/** Last good remote snapshot held by this server instance. */
let lastGoodRemote: AirportStatusSnapshot | null = null;

export function resetAirportStatusCache(): void {
  lastGoodRemote = null;
}

async function snapshotFrom(provider: AirportStatusProvider, now: Date, issues: string[]): Promise<AirportStatusSnapshot> {
  const feed = normalizeFeed(await provider.load(now), { now, allowSamples: provider.allowSamples });
  const hasRecords = feed.records.length > 0;
  return {
    mode: hasRecords ? provider.mode : "unavailable",
    live: hasRecords && provider.live,
    records: feed.records,
    conflicts: feed.conflicts,
    lastSuccessfulUpdate: feed.lastFetchedAt,
    refreshFailed: false,
    issues: [...issues, ...feed.issues],
  };
}

export async function getAirportStatusSnapshot(options: ServiceOptions = {}): Promise<AirportStatusSnapshot> {
  const now = options.now ?? new Date();
  const env = options.env ?? (process.env as ProviderEnv);
  const { provider, fallback, issues } = selectProvider(env, options.fetchImpl, options.manual);

  if (!fallback) return snapshotFrom(provider, now, issues);

  // Remote provider with a manual fallback.
  try {
    const snap = await snapshotFrom(provider, now, issues);
    // An empty or wholly invalid feed is not a successful update.
    if (snap.records.length === 0) throw new Error(`no verifiable records (${snap.issues.slice(0, 3).join("; ")})`);
    lastGoodRemote = snap;
    return snap;
  } catch (error) {
    const reason = `remote: refresh failed (${error instanceof Error ? error.message : "unknown"})`;
    if (lastGoodRemote) return { ...lastGoodRemote, live: false, refreshFailed: true, issues: [reason] };
    const manual = await snapshotFrom(fallback, now, [...issues, reason]);
    return { ...manual, refreshFailed: true };
  }
}
