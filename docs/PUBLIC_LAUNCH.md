# Public launch record

## Decision

The Product Owner approved the public launch of SafrBwai on 2026-10-12. Approval covered:

- the security patch (PR #50);
- opening public pages to search engines;
- switching the product stage to `public`;
- the public-release copy, including the Privacy and Terms wording.

The legal pages remain approved by the Product Owner. They are not an independent legal review, and the approval notice on each page still says so.

## What the launch changes

- `publicIndexing` becomes `enabled`:
  - the site-wide robots metadata becomes `index, follow`;
  - `robots.txt` allows `/` and disallows `/api/`, `/admin`, `/auth`, and `/dashboard`, and links the sitemap;
  - the sitemap lists `/`, `/analyze-offer`, `/analyze-hotel`, `/guides` and each reviewed guide, `/privacy`, and `/terms`.
- The product stage becomes `public`. The stage resolver checks the launch gate at build time, so the build fails if any gate item is false.
- "Pre-launch" copy is removed from:
  - the home badge and the release-scope title, now «الإصدار الأول» / "First release";
  - preview badges, the account-unavailable message, and page descriptions;
  - the guide's first step;
  - Privacy, Terms, and the README.
- Private pages keep their own `noindex` metadata. Preview tools (destination checklist, hotel comparison, knowledge library) are not in the sitemap and keep their preview labels.

## Launch gate evidence

| Gate item | Evidence |
| --- | --- |
| Required capabilities enabled | `textOfferAnalysis`, `travelGuides`, and `publicIndexing` are `enabled`. |
| `automatedChecksPassed` | On the launch branch: lint clean, typecheck clean, 723/723 tests in 86 files (including the regression suite), and a successful production build. CI repeats the same checks on the PR. |
| `legalDocumentsApproved` | Product Owner approval on 2026-10-12, as described above. |
| `noExpectedFailureFixtures` | `KNOWN_REGRESSION_GAPS` is empty, and a test enforces it. |
| `feedbackDurableOrHidden` | Feedback stays disabled: `/api/feedback` returns `503 FEEDBACK_DISABLED`. |
| `noDisabledNavigationLinks` | Navigation lists only enabled capabilities, and tests enforce it. |
| `noUnintendedLegacyStageCopy` | No "pre-launch" copy remains outside the stage labels used by the `prelaunch` stage. |
| `noFakeResults` | Unchanged: preview tools show no results, and the hotel lookup never shows synthetic data. |
| `enabledInputsSecurityReviewed` | See "Security review" below. |

## Security review of enabled inputs (2026-10-12)

Scope: the inputs open to the public:

- `POST /api/offer/analyze`, for text analysis;
- `POST /api/hotels/search` and `POST /api/hotels/name`, for the hotel identity lookup.

PDF input runs only on Preview deployments and was reviewed separately in `docs/PDF_INPUT_SPEC.md`.

Code review:

- Each route uses the Node.js runtime and `force-dynamic`, and every response sends `Cache-Control: no-store`.
- Validation happens before any processing:
  - content type, otherwise `415`;
  - body size, otherwise `413`;
  - JSON shape, otherwise `400`;
  - unsupported sources such as `pdf`, otherwise `501` before reading the payload.
- Error bodies carry a code and a request ID only, never user text. Server logs record no offer text, evidence, hotel name, or city.
- The client IP for rate limiting comes from the platform (`ipAddress`), so `x-forwarded-for` spoofing does not change the key.
- The hotel lookup authenticates to Google with Vercel OIDC and Workload Identity Federation:
  - there are no API keys or service-account keys;
  - Preview and Production use separate service accounts;
  - every failure maps to one safe "unavailable" response.
- Response headers on every page:
  - Content-Security-Policy, with no `unsafe-eval` in production;
  - HSTS with preload;
  - `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, Referrer-Policy, and Permissions-Policy;
  - no `X-Powered-By`.

Live checks against the production domain, one request per case:

| Request | Result |
| --- | --- |
| Analyze with `text/plain` | `415 UNSUPPORTED_MEDIA_TYPE` |
| Analyze with malformed JSON | `400 INVALID_JSON` |
| Analyze with about 120 kB of text | `413 PAYLOAD_TOO_LARGE` |
| Analyze with `type: "pdf"` | `501 SOURCE_NOT_SUPPORTED` |
| `GET` on either API | `405` |
| Hotel search with a 5,000-character query | `413 PAYLOAD_TOO_LARGE` |
| Hotel search with an empty query | `400 BAD_REQUEST` |
| Feedback | `503 FEEDBACK_DISABLED` |
| Burst of analysis requests from one client | `429` from the Vercel Firewall rule `offer-analyze-rate-limit`, ahead of the application's own limiter |

Platform protection: the Vercel Firewall is active, with the custom rule above and automatic DDoS mitigation. In the day before launch, the mitigation denied about 280 automated requests.

Dependencies: PR #50 moved Next.js from 15.5.22 to 15.5.27 and patched sharp and PostCSS. `npm audit --omit=dev` reports 0 critical findings. The 7 remaining findings are all in the build-time Tailwind 3 toolchain and do not run in production.

Cost controls for the hotel lookup:

- a daily quota of 100 per method, shared with Preview;
- a USD 20 monthly project budget with alerts at 50%, 90%, and 100%.

When the quota is exhausted, visitors see the safe "temporarily unavailable" message.

## Rollback

- Fastest: in Vercel, use Instant Rollback to promote the previous Production deployment, which still runs the `prelaunch` stage with `noindex`.
- In code: set the stage back to `prelaunch` and `publicIndexing` back to `disabled`, then redeploy. The robots metadata, `robots.txt`, and the sitemap follow automatically.

## Follow-ups (not part of the launch)

- Submit the sitemap in Google Search Console and Bing Webmaster Tools. This needs the owner's accounts.
- Before accounts are enabled, restrict the `next` redirect in `/auth/callback` to same-origin paths. It is not reachable today because accounts are not configured.
- Watch the hotel lookup quota after launch, and raise it only with a matching budget decision.
- Migrate to Tailwind 4 to clear the remaining build-time audit findings.
