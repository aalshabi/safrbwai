// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { config } from "@/middleware";

const root = process.cwd();

/** Width, height and colour type from a PNG's IHDR chunk. */
function pngInfo(path: string) {
  const bytes = readFileSync(join(root, path));
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

describe("installable web app (home-screen icon)", () => {
  const app = manifest();
  const icons = app.icons ?? [];

  it("declares a standalone app scoped to the whole site", () => {
    expect(app).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone", short_name: "سافر بوعي" });
  });

  it.each([
    ["192x192", "any"],
    ["512x512", "any"],
    ["512x512", "maskable"],
  ])("has a %s PNG icon for purpose %s whose file matches its declared size", (sizes, purpose) => {
    const icon = icons.find((i) => i.type === "image/png" && i.sizes === sizes && i.purpose === purpose);
    expect(icon).toBeDefined();
    const [w, h] = sizes.split("x").map(Number);
    const info = pngInfo(join("public", icon!.src));
    expect([info.width, info.height]).toEqual([w, h]);
  });

  it("has an opaque 180x180 iPhone icon and full-screen iPhone metadata", () => {
    // Colour type 2 = RGB without alpha: iOS fills transparency with black.
    expect(pngInfo("src/app/apple-icon.png")).toEqual({ width: 180, height: 180, colorType: 2 });
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
    expect(layout).toMatch(/appleWebApp:\s*{\s*capable: true,\s*title: "سافر بوعي"/);
    expect(layout).toContain(`"apple-mobile-web-app-capable": "yes"`);
  });

  it("serves the manifest and icons without running the auth middleware", () => {
    const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);
    for (const path of ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/maskable-512.png", "/apple-icon.png", "/_vercel/insights/view"]) {
      expect(matches(path), path).toBe(false);
    }
    for (const path of ["/", "/admin", "/dashboard/x", "/analyze-offer"]) {
      expect(matches(path), path).toBe(true);
    }
  });
});
