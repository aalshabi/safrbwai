/**
 * Gate for editor changes to manual-feed.json: CI fails if any record would
 * be rejected or hidden. Run locally with `npm run airport:check`.
 */

import { describe, expect, it } from "vitest";
import manualFeed from "./manual-feed.json";
import { isApprovedAuthorityHost, normalizeFeed } from "./normalize";
import { AUTHORITATIVE_TYPES } from "./status";

describe("manual-feed.json", () => {
  const now = new Date();
  const raw = (manualFeed as { records?: unknown[] }).records;
  const feed = normalizeFeed(manualFeed, { now, allowSamples: false });

  it("is an object with a records array", () => {
    expect(Array.isArray(raw)).toBe(true);
  });

  it("has no rejected fields or records", () => {
    // Each issue names the record index, airport and the reason.
    expect(feed.issues).toEqual([]);
  });

  it("uses only the sources the editor guide accepts", () => {
    // Official airport, GACA and SPA records must come from a government or
    // approved host; airline notices may come from the airline's own site.
    // Trackers, manual reviews and other news sites are not accepted here.
    const rejected = feed.records
      .filter(
        (r) =>
          !AUTHORITATIVE_TYPES.includes(r.source.type) ||
          (r.source.type !== "airline_notice" && !isApprovedAuthorityHost(r.source.url))
      )
      .map((r) => `${r.airportCode}: ${r.source.type} ${r.source.url}`);
    expect(rejected).toEqual([]);
  });

  it("has no template placeholders left in links or dates", () => {
    // The editor guide's templates use "…/رابط-…" links; publishing one would
    // point travellers at a page that does not exist.
    const text = JSON.stringify(raw ?? []);
    expect(text).not.toMatch(/…|%E2%80%A6|رابط-/);
  });

  it("contains no sample records", () => {
    expect((raw ?? []).some((r) => (r as { sample?: unknown }).sample !== undefined)).toBe(false);
  });
});
