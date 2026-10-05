import { describe, it, expect } from "vitest";
import { boardRule } from "./board-rule";

describe("boardRule", () => {
  it("preserves Arabic and English stated breakfast inclusion", () => {
    expect(boardRule.apply("يشمل الإفطار").facts.board?.value).toBe("BB");
    expect(boardRule.apply("includes breakfast").facts.board?.value).toBe("BB");
  });
  it("extracts BB from Arabic", () => {
    const r = boardRule.apply("الباقة شاملة الإفطار");
    expect(r.facts.board?.value).toBe("BB");
    expect(r.facts.board?.confidenceType).toBe("exact");
    expect(r.facts.board?.evidence).toContain("الإفطار");
  });

  it("extracts HB from English", () => {
    expect(boardRule.apply("Half board included").facts.board?.value).toBe("HB");
  });

  it("extracts FB from Arabic", () => {
    expect(boardRule.apply("إقامة كاملة مع جميع الوجبات").facts.board?.value).toBe("FB");
  });

  it("does not extract when board types conflict (adds a warning)", () => {
    const r = boardRule.apply("شامل الإفطار فقط، لكن جميع الوجبات مذكورة");
    expect(r.facts.board).toBeUndefined();
    expect(r.warnings.length).toBe(1);
  });

  it("returns nothing for unrelated text", () => {
    expect(boardRule.apply("جو رائع وخدمة ممتازة").facts).toEqual({});
  });
});
