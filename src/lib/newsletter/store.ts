import type { WatiConfig } from "./config";

export interface NewsletterStore {
  /** Adds or updates the subscriber; throws when the provider does not confirm it. */
  subscribe(phone: string, consentedAt: Date): Promise<void>;
}

/** The tag a Wati broadcast filters on to reach newsletter subscribers. */
export const NEWSLETTER_ATTRIBUTE = "safrbwai_newsletter";

/**
 * Adds the number as a Wati contact (v1 addContact), then sets the newsletter
 * attribute, the consent time and the source with updateContactAttributes, so
 * a number Wati already knows (an earlier customer chat) is subscribed too.
 * addContact may refuse an existing contact; only the attribute update must
 * succeed. Only the phone number is sent; no name, IP or page data.
 */
export class WatiNewsletterStore implements NewsletterStore {
  constructor(
    private readonly config: WatiConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 8_000
  ) {}

  async subscribe(phone: string, consentedAt: Date): Promise<void> {
    const body = JSON.stringify({
      customParams: [
        { name: NEWSLETTER_ATTRIBUTE, value: "subscribed" },
        { name: "newsletter_consent_at", value: consentedAt.toISOString() },
        { name: "newsletter_source", value: "safrbwai.com" },
      ],
    });
    await this.post(`addContact/${phone}`, body).catch(() => undefined);
    const response = await this.post(`updateContactAttributes/${phone}`, body);
    if (!response.ok) throw new Error(`Wati updateContactAttributes failed with status ${response.status}`);
  }

  private post(path: string, body: string): Promise<Response> {
    return this.fetchImpl(`${this.config.endpoint}/api/v1/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.token}`,
        "content-type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
