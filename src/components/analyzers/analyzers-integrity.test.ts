import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function src(p: string): string {
  return readFileSync(join(process.cwd(), p), "utf8");
}

const hotel = src("src/components/analyzers/hotel-analyzer.tsx");
const dest = src("src/components/analyzers/destination-advisor.tsx");
const cmp = src("src/components/analyzers/compare-hotels.tsx");
const offer = src("src/components/analyzers/offer-analyzer.tsx");

describe("public analyzers do not generate demo data", () => {
  // (4) hotel: entering a name never yields a numeric score
  it("hotel analyzer calls no engine and saves nothing", () => {
    expect(hotel).not.toMatch(/analyzeHotelDeep\s*\(/);
    expect(hotel).not.toMatch(/saveAnalysis\s*\(/);
    expect(hotel).not.toContain("ScoreRing");
    expect(hotel).toContain("AnalyzerPreview");
  });

  // (5) destination: no fabricated recommendation / season
  it("destination advisor calls no engine and saves nothing", () => {
    expect(dest).not.toMatch(/adviseDestination\s*\(/);
    expect(dest).not.toMatch(/saveAnalysis\s*\(/);
    expect(dest).toContain("AnalyzerPreview");
  });

  // (6) compare: never selects a winner
  it("compare hotels calls no engine, picks no winner, saves nothing", () => {
    expect(cmp).not.toMatch(/(?<![A-Za-z])compareHotels\s*\(/); // engine fn, not the component
    expect(cmp).not.toMatch(/saveAnalysis\s*\(/);
    expect(cmp).not.toContain("winner");
    expect(cmp).toContain("AnalyzerPreview");
  });

  // (7) no saveAnalysis anywhere in the demo analyzers (incl. offer)
  it("no analyzer persists a demo result via saveAnalysis", () => {
    for (const file of [hotel, dest, cmp, offer]) {
      expect(file).not.toMatch(/saveAnalysis\s*\(/);
    }
  });

  /**
   * A preview that waits behind a "جاري التحليل" spinner asserts that work is
   * happening. Nothing is computed here, so there is nothing to wait for.
   */
  it("no preview analyzer simulates a wait or claims to be analysing", () => {
    for (const file of [hotel, dest, cmp]) {
      expect(file).not.toMatch(/setTimeout/);
      expect(file).not.toContain("PREVIEW_DELAY");
      expect(file).not.toContain("AnalyzerLoading");
    }
  });
});
