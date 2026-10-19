import { describe, it, expect } from "vitest";
import { boardRule } from "./board-rule";

describe("boardRule", () => {
  it("preserves Arabic and English stated breakfast inclusion", () => {
    expect(boardRule.apply("يشمل الإفطار").facts.board?.value).toBe("BB");
    expect(boardRule.apply("includes breakfast").facts.board?.value).toBe("BB");
    expect(boardRule.apply("شامل الضرائب والإفطار").facts.board?.value).toBe("BB");
    expect(boardRule.apply("includes taxes and breakfast").facts.board?.value).toBe("BB");
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

describe("board upgrades and buffet breakfast", () => {
  it("takes the plan an upgrade leads to, not the one it leaves", () => {
    const r = boardRule.apply("إقامة كاملة Full Board تشمل الوجبات\nترقية مجانية من نصف إقامة HB إلى إقامة كاملة FB.");
    expect(r.facts.board?.value).toBe("FB");
  });

  it("reads a buffet breakfast as bed and breakfast", () => {
    expect(boardRule.apply("غرفة بإطلالة بحرية وإفطار بوفيه مفتوح").facts.board?.value).toBe("BB");
  });

  it("never reads a breakfast the offer excludes as the board", () => {
    expect(boardRule.apply("غير مشمول: إفطار بوفيه").facts.board).toBeUndefined();
    expect(boardRule.apply("### غير مشمول\n- إفطار بوفيه يومي.").facts.board).toBeUndefined();
    expect(boardRule.apply("السعر غير شامل الإفطار").facts.board).toBeUndefined();
  });

  it("never reads a breakfast excluded after the signal as the board", () => {
    expect(boardRule.apply("إفطار بوفيه غير مشمول").facts.board).toBeUndefined();
    expect(boardRule.apply("buffet: إفطار يومي not included").facts.board).toBeUndefined();
    expect(boardRule.apply("مع الإفطار، النقل غير مشمول").facts.board?.value).toBe("BB");
  });
});
