import { afterEach, describe, expect, it, vi } from "vitest";
import { getCapability } from "@/lib/product/capabilities";
import Page from "./page";

function pageEnabled(): boolean {
  return (Page() as { props: { enabled: boolean } }).props.enabled;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/analyze-hotel activation gate", () => {
  it("marks the capability as enabled (Phase 6C-3 activation)", () => {
    expect(getCapability("hotelIdentityLookup").status).toBe("enabled");
  });

  it("enables the UI in Production only when the server flag is exactly true", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_TARGET_ENV", "production");
    expect(pageEnabled()).toBe(true);
  });

  it("enables the UI on a Preview deployment when the server flag is exactly true", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_TARGET_ENV", "preview");
    expect(pageEnabled()).toBe(true);
  });

  it.each(["production", "preview", ""])(
    "stays disabled in the %j environment without the server flag",
    (environment) => {
      vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "");
      vi.stubEnv("VERCEL_ENV", environment);
      vi.stubEnv("VERCEL_TARGET_ENV", environment);
      expect(pageEnabled()).toBe(false);
    }
  );

  it.each(["false", "TRUE", "1"])(
    "stays disabled in Production when the server flag is %j",
    (flag) => {
      vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", flag);
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("VERCEL_TARGET_ENV", "production");
      expect(pageEnabled()).toBe(false);
    }
  );
});
