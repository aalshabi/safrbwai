import type { WatiConfig } from "./config";

export interface NewsletterStore {
  /** Adds or updates the subscriber; throws when the provider does not confirm it. */
  subscribe(phone: string, consentedAt: Date): Promise<void>;
}

/** The tag a Wati broadcast filters on to reach newsletter subscribers. */
export const NEWSLETTER_ATTRIBUTE = "safrbwai_newsletter";

/**
 * Adds the number as a Wati contact (v1 addContact) with the newsletter
 * attribute, the consent time and the source, so broadcasts can target it.
 * Only the phone number is sent; no name, IP or page data.
 */
export class WatiNewsletterStore implements NewsletterStore {
  constructor(
    private readonly config: WatiConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 8_000
  ) {}

  async subscribe(phone: string, consentedAt: Date): Promise<void> {
    const response = await this.fetchImpl(`${this.config.endpoint}/api/v1/addContact/${phone}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        customParams: [
          { name: NEWSLETTER_ATTRIBUTE, value: "subscribed" },
          { name: "newsletter_consent_at", value: consentedAt.toISOString() },
          { name: "newsletter_source", value: "safrbwai.com" },
        ],
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Wati addContact failed with status ${response.status}`);
  }
}
