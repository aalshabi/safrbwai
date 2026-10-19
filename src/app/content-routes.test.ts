import { describe, expect, it } from "vitest";
import * as guidePage from "./guides/[slug]/page";
import * as insightPage from "./insights/[slug]/page";

describe("guide and insight routes", () => {
  it("serve only prerendered slugs, so an unknown slug is a real 404", () => {
    expect(guidePage.dynamicParams).toBe(false);
    expect(insightPage.dynamicParams).toBe(false);
  });
});
