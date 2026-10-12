import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_CONTENT } from "@/components/legal-page";
import { isPublicBetaFeedbackEnabled, isServerBetaFeedbackEnabled } from "@/lib/feedback/config";
import { KNOWN_REGRESSION_GAPS } from "@/lib/offer-pipeline/regression/load-fixtures";
import { getProductStage } from "@/lib/product/stage";
import { SITE_ROBOTS } from "@/lib/seo";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const guideSources = [
  "src/components/guide/guide-launcher.tsx",
  "src/components/guide/guide-panel.tsx",
  "src/components/guide/guide-progress.tsx",
  "src/components/guide/guide-provider.tsx",
  "src/components/guide/guide-spotlight.tsx",
  "src/components/guide/guide-step.tsx",
  "src/lib/guide/config.ts",
  "src/lib/guide/routes.ts",
  "src/lib/guide/selectors.ts",
  "src/lib/guide/storage.ts",
  "src/lib/guide/types.ts",
].map(read).join("\n");

describe("guide privacy, accessibility, and launch integrity", () => {
  it("adds the exact guide storage disclosure in Arabic and English", () => {
    const ar = LEGAL_CONTENT.privacy.ar.map(({ p }) => p).join(" ");
    const en = LEGAL_CONTENT.privacy.en.map(({ p }) => p).join(" ");
    expect(ar).toContain("قد يحفظ مساعد الاستخدام محليًا حالة إكمال الجولة أو تخطيها على هذا الجهاز. لا يحفظ نص العرض أو نتيجة التحليل أو أي بيانات شخصية.");
    expect(en).toContain("The usage guide may store only the guide completion or skip state locally on this device. It does not store offer text, analysis results, or personal data.");
  });

  it("contains no network, analytics, HTML injection, or external service calls", () => {
    expect(guideSources).not.toMatch(/fetch\s*\(|XMLHttpRequest|sendBeacon|dangerouslySetInnerHTML|analytics|openai|google maps/i);
  });

  it("does not read input values or analysis objects", () => {
    const runtimeSources = [
      "src/components/guide/guide-provider.tsx",
      "src/components/guide/guide-panel.tsx",
      "src/components/guide/guide-spotlight.tsx",
      "src/lib/guide/storage.ts",
    ].map(read).join("\n");
    expect(runtimeSources).not.toMatch(/offer-text|\.value|textContent|innerText|analysisRequestId|observations|evidence/i);
  });

  it("keeps mobile panels bounded, scrollable, safe-area aware, and horizontally contained", () => {
    const panel = read("src/components/guide/guide-panel.tsx");
    const launcher = read("src/components/guide/guide-launcher.tsx");
    expect(panel).toContain("max-h-[55dvh]");
    expect(panel).toContain("overflow-y-auto");
    expect(panel).toContain("safe-area-inset-bottom");
    expect(panel).toContain("xl:w-[19rem]");
    expect(launcher).toContain("safe-area-inset-bottom");
  });

  it("provides dialog labeling, live progress, keyboard handling, and focus restoration", () => {
    const panel = read("src/components/guide/guide-panel.tsx");
    const provider = read("src/components/guide/guide-provider.tsx");
    expect(panel).toContain('role="dialog"');
    expect(panel).toContain('aria-labelledby="guide-title"');
    expect(panel).toContain('aria-describedby="guide-description"');
    expect(panel).toContain('aria-live="polite"');
    expect(panel).toContain('event.key === "Escape"');
    expect(panel).toContain('event.key !== "Tab"');
    expect(provider).toContain("launcherRef.current?.focus()");
  });

  it("attaches all ten stable targets to the existing offer flow", () => {
    const sources = [
      "src/components/offer-input/travel-offer-input-selector.tsx",
      "src/components/offer-input/text-offer-input.tsx",
      "src/components/offer-input/travel-offer-review.tsx",
      "src/components/offer-input/offer-analysis-result.tsx",
      "src/components/offer-input/result-actions.tsx",
    ].map(read).join("\n");
    for (const id of [
      "offer-source-text", "offer-textarea", "offer-review", "offer-submit",
      "result-confirmed", "result-missing", "result-contradictions", "result-questions",
      "copy-questions", "copy-summary",
    ]) {
      expect(sources).toContain(`\"${id}\"`);
    }
  });

  it("preserves the public stage, disabled feedback, indexing, and zero known regression gaps", () => {
    expect(getProductStage()).toBe("public");
    expect(isPublicBetaFeedbackEnabled("false")).toBe(false);
    expect(isServerBetaFeedbackEnabled("false")).toBe(false);
    expect(SITE_ROBOTS).toEqual({ index: true, follow: true });
    expect(KNOWN_REGRESSION_GAPS).toEqual({});
  });
});
