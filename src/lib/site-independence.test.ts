import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

/**
 * SafrBwai is published as an independent educational site. No travel agency
 * of the owner's is named anywhere in what visitors read, so nothing on the
 * site reads as that agency's marketing.
 */
describe("site independence", () => {
  const files = execFileSync("git", ["ls-files", "src"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));

  it.each(["سكاي العالمية", "Sky Global", "skysglobal", "wa.me/"])("never mentions %s", (needle) => {
    const offenders = files.filter((file) => readFileSync(join(process.cwd(), file), "utf8").includes(needle));
    expect(offenders).toEqual([]);
  });
});
