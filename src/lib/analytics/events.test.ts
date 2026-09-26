import { describe, expect, it, vi } from "vitest";
import { trackAnalyticsEvent } from "./client";
import { campaignSourceFromSearch, createAnalyticsEvent } from "./events";

describe("privacy-safe analytics events", () => {
  it("keeps only allowlisted properties and drops sensitive offer data", () => {
    const event = createAnalyticsEvent("offer_analysis_completed", {
      locale: "ar",
      campaignSource: "Instagram_Ads",
      offerText: "اسم المسافر ورقم البطاقة",
      evidence: "عرض خاص",
      analysis: { price: 5000 },
      name: "Abdullah",
      email: "person@example.com",
      paymentDetails: "4111111111111111",
    });

    expect(event).toEqual({
      name: "offer_analysis_completed",
      properties: { locale: "ar", campaignSource: "instagram_ads" },
    });
    expect(JSON.stringify(event)).not.toContain("رقم البطاقة");
    expect(JSON.stringify(event)).not.toContain("person@example.com");
    expect(JSON.stringify(event)).not.toContain("4111111111111111");
  });

  it("rejects unknown events and unsafe campaign sources", () => {
    expect(createAnalyticsEvent("offer_text_uploaded", { locale: "ar" })).toBeNull();
    expect(campaignSourceFromSearch("?utm_source=%3Cscript%3Ealert(1)%3C/script%3E")).toBeUndefined();
  });

  it("does not transmit when no approved transport is configured", () => {
    expect(trackAnalyticsEvent("offer_analysis_started", { locale: "en" })).toBe("disabled");
    const send = vi.fn();
    expect(trackAnalyticsEvent("offer_analysis_started", { locale: "en" }, { send })).toBe("sent");
    expect(send).toHaveBeenCalledWith({
      name: "offer_analysis_started",
      properties: { locale: "en" },
    });
  });
});
