import { describe, expect, it } from "vitest";
import { isFresh, parseSnapshot, rankWithCuration, WEEKLY_REFRESH_MS } from "./selection";

const item = (id: string, metric: number | null) => ({ id, metric });

describe("rankWithCuration", () => {
  it("orders by the metric, puts items without it last, and caps the count", () => {
    const ranked = rankWithCuration([item("a", 5), item("b", null), item("c", 50), item("d", 10)], { pinned: [], excluded: [] }, 3);
    expect(ranked.map((x) => x.id)).toEqual(["c", "d", "a"]);
  });

  it("keeps pin order, ignores pins outside the pool, and never shows an excluded item even if pinned", () => {
    const ranked = rankWithCuration(
      [item("a", 5), item("b", 1), item("c", 50)],
      { pinned: ["b", "zz", "c"], excluded: ["c"] },
      4
    );
    expect(ranked.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("snapshots", () => {
  it("parses only well-formed saved rankings", () => {
    const isEntry = (value: unknown): value is { id: string } => typeof (value as { id?: unknown })?.id === "string";
    expect(parseSnapshot(null, isEntry)).toBeNull();
    expect(parseSnapshot("[]", isEntry)).toBeNull();
    expect(parseSnapshot("not json", isEntry)).toBeNull();
    const good = { version: 2, refreshedAt: "2026-10-01T00:00:00.000Z", poolSize: 3, entries: [{ id: "1" }, { nope: 1 }] };
    expect(parseSnapshot(JSON.stringify(good), isEntry)?.entries).toEqual([{ id: "1" }]);
  });

  it("is fresh for seven days", () => {
    const at = Date.parse("2026-10-01T00:00:00.000Z");
    const snap = { version: 2 as const, refreshedAt: new Date(at).toISOString(), poolSize: 1, entries: [] };
    expect(isFresh(snap, at + WEEKLY_REFRESH_MS - 1)).toBe(true);
    expect(isFresh(snap, at + WEEKLY_REFRESH_MS)).toBe(false);
    expect(isFresh(null, at)).toBe(false);
  });
});
