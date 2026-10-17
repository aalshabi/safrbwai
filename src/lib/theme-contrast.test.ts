import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tailwindConfig from "../../tailwind.config";

// Guards the WCAG AA contrast of the brand teal in both themes.
// Colors are read from the real sources (globals.css + tailwind.config.ts),
// so a future token change that breaks contrast fails here.

type RGB = [number, number, number];

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
const darkBlock = css.slice(css.indexOf(".dark {"));

function cssVar(block: string, name: string): string {
  const m = block.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`--${name} not found`);
  return m[1].trim();
}

const rgbChannels = (v: string): RGB => v.split(/\s+/).map(Number) as RGB;

function hsl(v: string): RGB {
  const [h, s, l] = v.replace(/%/g, "").split(/\s+/).map(Number);
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

const hex = (v: string): RGB => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as RGB;

function luminance([r, g, b]: RGB): number {
  const c = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrast(a: RGB, b: RGB): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const colors = tailwindConfig.theme?.extend?.colors as Record<string, Record<string, string>>;
const teal = colors.teal;
const navy = colors.navy;
const white: RGB = [255, 255, 255];

const light = {
  bg: hsl(cssVar(lightBlock, "background")),
  card: hsl(cssVar(lightBlock, "card")),
  teal: rgbChannels(cssVar(lightBlock, "teal")),
  primary: hsl(cssVar(lightBlock, "primary")),
  primaryFg: hsl(cssVar(lightBlock, "primary-foreground")),
};
const dark = {
  bg: hsl(cssVar(darkBlock, "background")),
  card: hsl(cssVar(darkBlock, "card")),
  teal: rgbChannels(cssVar(darkBlock, "teal")),
  primary: hsl(cssVar(darkBlock, "primary")),
  primaryFg: hsl(cssVar(darkBlock, "primary-foreground")),
};

describe("theme contrast (WCAG AA, 4.5:1 for body text)", () => {
  it("teal DEFAULT is a theme-aware CSS variable", () => {
    expect(teal.DEFAULT).toBe("rgb(var(--teal) / <alpha-value>)");
  });

  it("text-teal is readable on light surfaces", () => {
    expect(contrast(light.teal, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.teal, light.card)).toBeGreaterThanOrEqual(4.5);
  });

  it("text-teal is readable on dark surfaces", () => {
    expect(contrast(dark.teal, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark.teal, dark.card)).toBeGreaterThanOrEqual(4.5);
  });

  it("teal-700 text (light) and teal-300 text (dark) pass", () => {
    expect(contrast(hex(teal["700"]), light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(teal["300"]), dark.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("primary button: white on teal-700 (light), navy-950 on teal-500 (dark)", () => {
    expect(contrast(white, hex(teal["700"]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(white, hex(teal["800"]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(navy["950"]), hex(teal["500"]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(navy["950"]), hex(teal["400"]))).toBeGreaterThanOrEqual(4.5);
  });

  it("bright CTA on navy: navy-950 on teal-500 and the button stands off navy", () => {
    expect(contrast(hex(navy["950"]), hex(teal["500"]))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(teal["500"]), hex(navy.DEFAULT))).toBeGreaterThanOrEqual(3);
  });

  it("shadcn primary tokens pass in both themes", () => {
    expect(contrast(light.primaryFg, light.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark.primaryFg, dark.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("button variants use the contrast-safe pairs", () => {
    const src = readFileSync(join(process.cwd(), "src/components/ui/button.tsx"), "utf8");
    expect(src).toContain("bg-teal-700 text-white");
    expect(src).toContain("dark:bg-teal-500 dark:text-navy-950");
    expect(src).toContain("bright:");
  });
});
