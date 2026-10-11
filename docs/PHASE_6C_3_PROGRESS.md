# Phase 6C-3 — Compliance and controlled activation progress record

## Status

- Authorization: Product Owner authorized Steps A (read-only readiness) and B (Preview readiness) on 2026-10-08. Step C (Production activation) is not authorized and requires a separate, explicit decision.
- Step A: complete.
- Step B: code merged (PR #43, merge commit `c141399ae7dc638bca2d597cb8df600d52c163ac`). Provider-independent review completed on 2026-10-10. **Live Preview verification passed on 2026-10-11** (see "Step B — live Preview verification").
- Google Cloud and reseller track: **complete** on 2026-10-11. Billing linked through the contracted reseller, Places API (New) enabled, and the decided quotas, budget, and alerts applied.
- Step C: not started. It requires a separate, explicit activation decision.
- Production: hotel lookup disabled. Verified after the PR #43 deployment: both `/api/hotels/search` and `/api/hotels/name` return `503 HOTEL_SEARCH_DISABLED`, the UI renders disabled, and `noindex, nofollow` is unchanged. Re-checked on 2026-10-11 after the Google Cloud setup: `/api/hotels/search` on the production domain still returns `503 HOTEL_SEARCH_DISABLED`, and the page renders the disabled state.
- Product stage: `prelaunch`.

This repository is public. Google Cloud and Vercel identifiers are therefore recorded only by name, never by value.

## Owner decisions (2026-10-08)

1. Billing owner: the Product Owner.
2. Budget: USD 20 per month, with alerts at 50%, 90%, and 100%.
3. Quotas: one Google Cloud project with a shared daily quota of 100 requests each for Text Search and Place Details. Quotas apply per project, so Preview and Production share them.
4. Credentials: a separate service account per environment, bound to its exact Vercel OIDC subject, with no service-account keys.
5. Attribution: the official Google Maps logo.
6. Capability wording: "Hotel identity lookup", approved as shipped in 6C-2.

At these quotas the expected volume, about 3,000 calls per method per month, stays inside the monthly free usage cap for each SKU. The budget is a safety net; it does not cap usage.

## Step A — readiness findings

Pricing and terms, re-checked on 2026-10-08 against official Google pages:

- Text Search Pro: 5,000 free calls per month, then USD 32 per 1,000. Unchanged from the 2026-08-01 snapshot.
- Place Details with the `id,displayName` field mask bills as Place Details Pro: 5,000 free calls per month, then USD 17 per 1,000. The spec did not state this before.
- The method-specific OAuth scopes used by the provider remain supported.
- The Maps Platform Terms update of 2026-08-26 (effective 2026-09-28) changes liability provisions only. It does not affect attribution, caching, or EEA terms.
- Attribution policy: use the Google Maps logo "whenever possible". Text attribution is allowed only where space is limited.
- `displayName.languageCode` is documented as BCP-47 (for example `en-US`), so region subtags can occur.

Saudi billing constraint: Google Cloud does not offer self-serve billing for a Saudi billing address. Google Cloud services are contracted through CNTXT. Google Maps Platform APIs only can be contracted through an authorized Maps reseller. Billing for this project must therefore come from the reseller already contracted by the Product Owner.

## Step B — delivered

Code (PR #43):

- Official, unmodified Google Maps logo in the results list and the selected-hotel card, with light and dark variants, 18px high, and the required clear space.
- BCP-47 `languageCode` tags are reduced to their primary language.
- `/api/hotels/name` returns `localizedName: null` when the source language differs from the requested locale.
- Preview-only UI gate: on a Vercel Preview deployment the server flag alone enables the UI. Production and every other environment still require both the `hotelIdentityLookup` capability (still `preview`) and the server flag.

Google Cloud, on the dedicated SafrBwai project:

- IAM, IAM Credentials, and Security Token Service APIs enabled.
- A Workload Identity Pool and an OIDC provider for the Vercel team issuer. The allowed audience is the Vercel team audience, `google.subject` is mapped to `assertion.sub`, and an attribute condition restricts the provider to the `safrbwai` project subjects.
- Two service accounts, one for Preview and one for Production. Each grants `roles/iam.workloadIdentityUser` only to its exact environment subject and holds `roles/serviceusage.serviceUsageConsumer`.
- No API keys and no service-account keys.

Vercel, Preview environment only, all of type Config:

- `HOTEL_IDENTITY_LOOKUP_ENABLED=true`
- `GCP_PROJECT_NUMBER`
- `GCP_WORKLOAD_IDENTITY_POOL_ID`
- `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`
- `GCP_SERVICE_ACCOUNT_EMAIL` (the Preview service account)
- `VERCEL_TEAM_ID` (see the finding below)

No Production variable was added or changed.

## Step B — Preview verification so far

- After a redeploy, the Preview `/analyze-hotel` page renders the enabled form.
- First synthetic search: `503` with only the safe error. Runtime log `PROVIDER_CONFIG` after about 5 ms, before any provider call. Cause: Vercel does not expose `VERCEL_TEAM_ID`. The 6C-1 record now carries a correction.
- After `VERCEL_TEAM_ID` was added to Preview and Preview redeployed: `503` with only the safe error. Runtime log `PROVIDER_AUTH` after about 420 ms. Configuration now passes and the request reaches the network. The remaining rejection is expected while Places API (New) is not enabled on the project. The logs do not distinguish a token-exchange denial from a disabled API, so this must be re-checked once the API is enabled.
- No fabricated or preview results were rendered in any failure.

## Google Cloud setup (2026-10-11)

Verified in the Google Cloud console on the dedicated SafrBwai project:

- Billing: the project is linked to a paid billing account provided by the contracted Saudi Maps reseller.
- Places API (New): enabled.
- Quotas, both per day for the whole project:
  - Text Search (`SearchTextRequest per day`): 100;
  - Place Details (`GetPlaceRequest per day`): 100.
- Budget: monthly, specified amount USD 20, scoped to the SafrBwai project only, not the whole billing account. Alerts on actual spend at 50%, 90%, and 100%, emailed to billing admins and to project owners. The budget only sends alerts; no spend cap was set.

## Step B — live Preview verification (2026-10-11)

Deployment: the latest Preview deployment, which includes the PR #43 gate and the Preview variables. No variable was changed and no redeploy was needed, because the variables are read at runtime.

Searches used public hotel names only, with no personal or booking data:

| Search | Locale | `/api/hotels/search` | Result | `/api/hotels/name` | Selected-hotel card |
| --- | --- | --- | --- | --- | --- |
| «فندق برج العرب» / «دبي» | Arabic | 200 | 1 match | 200 | Arabic name, English name as the other-language name, address, coordinates, localized place type, business status, source link |
| "Atlantis The Palm" / "Dubai" | English | 200 | 1 match | 200 | English name, Arabic name as the other-language name, address, coordinates, place type "Resort hotel", business status, source link |

- Provider connectivity is confirmed. The 2026-10-08 `PROVIDER_AUTH` result was caused by the disabled API: with the API enabled, the token exchange, impersonation, and both methods succeed.
- Runtime logs for Preview over the preceding three hours contain no error, warning, or fatal entry. The `PROVIDER_CONFIG` and `PROVIDER_AUTH` failures do not recur.
- The source link opens the place's Google Maps record.

Attribution with live results, on the selected-hotel card:

| Locale | Width | Light | Dark |
| --- | --- | --- | --- |
| Arabic (RTL) | 390 px | Pass (gray logo) | Pass (white logo) |
| English (LTR) | 1440 px | Pass (gray logo) | Pass (white logo) |

- "Pass" means only the correct official logo variant was visible, at 98×18 px, inside the viewport, next to the "Source" label and the source link, with no horizontal scroll.
- The 1440 px cells were also reviewed by screenshot: the logo is legible and unmodified on both backgrounds.
- The remaining combinations (Arabic at 1440 px, English at 390 px) use the same component and were covered by the 2026-10-10 layout matrix.

## Provider-independent review (2026-10-10)

Baseline: `claude/demo-integrity-fixes` at merge commit `029158a9d1b985e32d85ea3366a1942160f57b90`.

### Completed independently of Google Cloud

- Checks on the baseline (about 07:20 Asia/Riyadh): lint clean, typecheck clean, 612/612 tests in 81 files, 41/41 regression tests, and a successful production build.
- Existing automated coverage of the safe states:
  - disabled route fails closed before reading input or constructing a provider;
  - configuration, authentication, timeout, quota, and malformed-response failures map to one safe response;
  - a real empty state contains no synthetic result;
  - a missing alternate name is not invented;
  - Production stays disabled with the server flag alone.
- Local Preview-mode review (about 07:30 Asia/Riyadh). A local server ran with the Preview server flag and no Google configuration. Results were supplied by an in-browser synthetic fixture, so no provider was contacted:
  - **Unavailable:** a real local search failed closed with `PROVIDER_CONFIG` after 4 ms, before any network call. The UI showed only the localized unavailable message, and the log contained no query text.
  - **Loading:** the localized searching state was shown.
  - **Empty:** the localized empty message was shown, with no results list and no selected card.
  - **Invalid input:** the browser's `required`/`minLength` validation blocked submission, and no request was sent.
  - `noindex, nofollow` was present throughout.
- Attribution layout matrix for the results list and the selected-hotel card. "Pass" means the correct logo variant was the only one visible, rendered at 18×98 px inside a `translate="no"` container with 10/10/5/10 px clear space, and the page had no horizontal scroll:

  | Locale | Width | Light | Dark |
  | --- | --- | --- | --- |
  | Arabic (RTL) | 390 px | Pass (gray logo) | Pass (white logo) |
  | Arabic (RTL) | 1440 px | Pass (gray logo) | Pass (white logo) |
  | English (LTR) | 390 px | Pass (gray logo) | Pass (white logo) |
  | English (LTR) | 1440 px | Pass (gray logo) | Pass (white logo) |

  - In every cell the alternate-locale name carried the correct `lang` attribute, and the source link used `noopener noreferrer`.
  - This verifies layout only. Live Google attribution with real results remains open.
- Defect found and fixed on branch `fix/hotel-place-type-labels`. The selected-hotel card displayed the raw source place type (for example `hotel`) on the Arabic page. Each allowed lodging type now has an Arabic and English label, and any other value is shown as the source sent it. Tests cover both locales and require a label for every allowed type. After the fix: 615/615 tests, 41/41 regression tests, lint, typecheck, and build all pass.

### Deferred pending the Google Cloud and reseller response (resolved 2026-10-11)

- Billing link, Places API (New) enablement, quotas, budget and alerts. At about 07:00 Asia/Riyadh the console showed the project not linked to a billing account and the API not enabled. Resolved: see "Google Cloud setup".
- Live synthetic Arabic and English searches on a Preview deployment. Resolved: see "Step B — live Preview verification".

### Blocked from live verification (resolved 2026-10-11)

- Provider connectivity: whether the `PROVIDER_AUTH` result is a token-exchange denial or a disabled API. Resolved: it was the disabled API.
- Attribution with live results. Resolved.
- Alternate-locale names returned by the provider. Resolved: returned in both directions.

## Open items

1. Done (2026-10-11): billing linked through the contracted reseller.
2. Done (2026-10-11): Places API (New) enabled.
3. Done (2026-10-11): quotas, budget, and alerts applied.
4. Done (2026-10-11): Preview verification and the attribution review with live results.
5. Step C, only after a separate decision. Add the Production variables (including `VERCEL_TEAM_ID` and the Production service account), set the server flag, decide whether to enable the `hotelIdentityLookup` capability, then run the post-deployment smoke test and a rollback check.

## Rollback

Unchanged from the spec. First set `HOTEL_IDENTITY_LOOKUP_ENABLED` to anything other than `true` and redeploy; the UI then returns to its disabled state and no provider call can be made. Removing the Preview variables or disabling the service accounts also stops all calls.
