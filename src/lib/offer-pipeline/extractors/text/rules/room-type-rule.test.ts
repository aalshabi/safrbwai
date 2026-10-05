import { describe, expect, it } from "vitest";
import { roomTypeRule } from "./room-type-rule";

describe("roomTypeRule", () => {
  it("preserves explicit Arabic and English room types", () => {
    expect(roomTypeRule.apply("غرفة ديلوكس واحدة").facts.roomType?.value).toBe("غرفة ديلوكس");
    expect(roomTypeRule.apply("one deluxe room").facts.roomType?.value).toBe("deluxe room");
  });

  it("does not treat room quantity as a room type", () => {
    expect(roomTypeRule.apply("غرفة واحدة لمدة خمس ليالٍ").facts.roomType).toBeUndefined();
    expect(roomTypeRule.apply("one room for five nights").facts.roomType).toBeUndefined();
  });
});
