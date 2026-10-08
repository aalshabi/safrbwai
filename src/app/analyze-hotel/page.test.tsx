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
  it("keeps the capability in preview", () => {
    expect(getCapability("hotelIdentityLookup").status).toBe("preview");
  });

  it("stays disabled in Production with the server flag alone", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_TARGET_ENV", "production");
    expect(pageEnabled()).toBe(false);
  });

  it("stays disabled outside Vercel with the server flag alone", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_TARGET_ENV", "");
    expect(pageEnabled()).toBe(false);
  });

  it("enables the UI on a Preview deployment when the server flag is exactly true", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_TARGET_ENV", "preview");
    expect(pageEnabled()).toBe(true);
  });

  it.each(["false", "", "TRUE", "1"])(
    "stays disabled on Preview when the server flag is %j",
    (flag) => {
      vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", flag);
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("VERCEL_TARGET_ENV", "preview");
      expect(pageEnabled()).toBe(false);
    }
  );

  it("does not treat a Production target as Preview", () => {
    vi.stubEnv("HOTEL_IDENTITY_LOOKUP_ENABLED", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_TARGET_ENV", "production");
    expect(pageEnabled()).toBe(false);
  });
});
