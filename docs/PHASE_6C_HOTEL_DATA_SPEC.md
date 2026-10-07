# Phase 6C — Official hotel data specification

## Status

- Decision status: Provider, first-release cost tier, OIDC design, and bilingual legal copy approved by the Product Owner; consolidated approval recorded on 2026-08-21 (Asia/Riyadh).
- Implementation status: Phase 6C-1 provider boundary (PR #26) and Phase 6C-2 selection UI (PR #41, merge commit `5518a8a352f4e464847cafb89f277a7ee53e41c7`) are merged and deployed, disabled by default on both the client and the server. Phase 6C-3 activation has not started.
- Stable production baseline: `production-2026-08-01-phase-6b`.
- Baseline commit: `e0922a0aa544108a22833f6c11f162a729a72bc9`.
- Product stage remains `prelaunch`.
- The existing `/analyze-hotel` experience remains `preview` until every activation gate in this document passes.

This document defines the source, boundaries, architecture, privacy controls, cost controls, and acceptance criteria for the first real hotel-data integration. It does not authorize enabling the capability, adding credentials, changing Vercel, or publishing a production feature.

## Decision summary

Use **Google Places API (New)** as the approved official source for hotel identity and place facts.

The first implementation should use:

1. **Text Search (New)** for a submitted hotel name plus an optional city.
2. **Place Details (New)** for the selected Place ID when an alternate-locale name or selected-place details are needed.
3. A SafrBwai server endpoint as the only caller of Google Places.
4. Explicit field masks, server-side rate limits, restricted credentials, visible Google Maps attribution, and no persistent storage of Places content other than Place IDs.
5. Pro identity fields only in the first release; rating and user rating count are deferred.

Do not scrape Google Maps pages. Do not expose a Google credential to the browser. Do not invent a translated hotel name or present a generated result as sourced data.

## User problem

A traveler may know a hotel by an Arabic name, an English name, or a spelling variation. The current page accepts a name but deliberately returns a preview message rather than a real hotel match. Phase 6C must make hotel identification real and source-backed while preserving the product's integrity rules.

The phase must answer only what the source supports:

- Which hotel is this likely to be?
- What name did the source return for the active language?
- Is an alternate Arabic or English name available from the same source?
- Where is the hotel?
- Where can the user open the source record?

Finding a place is not, by itself, a complete review of value, review authenticity, hidden fees, room quality, cancellation terms, or booking safety.

## Reuse before new code

The implementation must extend the existing product boundaries instead of creating parallel systems:

- Keep `/analyze-hotel` as the route.
- Keep the current Arabic/English i18n dictionaries and RTL/LTR behavior.
- Keep `PRODUCT_CAPABILITIES` as the source of capability status.
- Keep `ProductStage` at `prelaunch` until the full launch gate passes.
- Reuse the existing request-ID and safe-error conventions.
- Reuse the existing server-side rate-limiting pattern.
- Keep Feedback disabled unless durable storage is approved separately.
- Keep `noindex, nofollow` unchanged in this phase.

## Scope

### In scope

- Search by hotel name in Arabic or English.
- Optional city input to disambiguate results.
- A short result list with explicit user selection when more than one plausible hotel is returned.
- Source-backed localized hotel name, address, location, status, place type, and Google Maps link.
- Arabic and English source names when Google returns distinct localized names.
- Clear source attribution and a direct source link.
- Deterministic normalization and validation of the provider response.
- Safe, localized empty, ambiguous, unavailable, quota, and rate-limit states.
- Tests and operational gates described below.

### Not in scope

- Scraping Google Maps or any public website.
- Booking, payments, availability, room prices, taxes, or cancellation terms.
- Ranking hotels or recommending one hotel over another.
- Review sentiment, review authenticity, generated summaries, or scoring.
- Photos, individual reviews, phone numbers, opening hours, or hotel websites in the first release.
- Autocomplete while the user types.
- Google rating and user rating count; they require a separate cost decision after the Pro identity release is measured.
- Hotel comparison.
- User accounts or saved hotel lists.
- Persistent storage of search queries or provider content.
- Analytics, Feedback activation, PDF, OCR, image input, or URL input.
- Public indexing or public launch.

## Why Google Places API (New)

Google Places supports text search, Place IDs, localized display names, addresses, location, place types, business status, and Google Maps links within the approved Pro identity scope. The provider also offers higher-tier fields, but those are outside the first release. It publishes explicit rules for field selection, attribution, caching, key security, quotas, and billing.

This is preferable to:

- **Web scraping:** fragile, difficult to secure, and not an approved data contract.
- **Synthetic data:** violates the requirement that visible hotel results be real.
- **A multi-provider abstraction in the first PR:** adds reconciliation, attribution, and licensing complexity before one provider is proven.
- **Autocomplete in the first PR:** creates a larger client interaction and billing surface without being required for an explicit submit flow.

The provider must remain behind a narrow internal interface so a future provider can be evaluated without leaking Google response shapes throughout the UI.

## Official references

- [Places API (New) overview](https://developers.google.com/maps/documentation/places/web-service/op-overview)
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Place data fields and SKU tiers](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- [Field-mask guidance](https://developers.google.com/maps/documentation/places/web-service/choose-fields)
- [Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Place ID guidance](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Current price list](https://developers.google.com/maps/billing-and-pricing/pricing)
- [API security best practices](https://developers.google.com/maps/api-security-best-practices)

Pricing and policy details are time-sensitive. The operator must re-check these official pages immediately before creating credentials and again before activation.

## Architecture

```text
Browser
  |
  | POST hotel name + optional city + locale
  v
SafrBwai hotel-search route
  |
  +-- input length/schema validation
  +-- per-client rate limit
  +-- capability/server flag check
  +-- request ID
  v
HotelDataProvider interface
  |
  v
GooglePlacesHotelProvider
  |
  +-- Text Search (New), explicit field mask
  +-- optional Place Details (New) for alternate locale
  v
Provider response validator and adapter
  |
  +-- allow-listed fields only
  +-- no raw provider body
  +-- no credential or upstream diagnostics
  v
Localized SafrBwai result
```

The browser must never call Places API directly. Provider credentials, field masks, error mapping, and response validation stay on the server.

## Proposed internal boundary

The names below are architectural contracts, not committed implementation names.

```ts
type HotelSearchInput = Readonly<{
  query: string;
  city?: string;
  locale: "ar" | "en";
}>;

type HotelDataSource = "google_places";

type SourcedHotel = Readonly<{
  placeId: string;
  requestedLocaleName: string;
  alternateLocaleName?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  primaryType?: string;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  googleMapsUri?: string;
  source: HotelDataSource;
}>;

interface HotelDataProvider {
  search(input: HotelSearchInput): Promise<readonly SourcedHotel[]>;
}
```

The public API must not serialize the raw Google response, provider debug metadata, credential details, upstream headers, or internal observations.

## Search behavior

1. Trim and Unicode-normalize the hotel name and optional city.
2. Reject an empty name, excessive length, control characters, URLs, or obviously secret/payment-like input before any provider call.
3. Build a text query from the name and optional city without adding unsupported facts.
4. Set `languageCode` to the active SafrBwai locale.
5. Request a small result page. Do not prefetch subsequent pages.
6. Do not rely on strict hotel-type filtering as the sole correctness control; Google documents that strict type filtering does not apply to hotel queries in the same way as supported strict-type queries.
7. Validate the returned place type and address context in the adapter, then present a short selection list rather than silently choosing a weak match.
8. Preserve provider order unless a documented deterministic eligibility rule removes non-hotel results.
9. Never claim that the first result is definitely the intended hotel.

### Ambiguity rule

- One eligible result: show it as the likely source match and still display its city/address.
- Multiple eligible results: require user selection.
- No eligible results: show a safe localized not-found state and invite the user to refine the hotel name or city.
- Weak or conflicting location context: do not auto-select.

## Arabic and English names

Google returns localized place content according to the request language when that content is available. It does not guarantee two distinct names for every place.

Required behavior:

- Search using the active locale (`ar` or `en`).
- Keep the returned display name as `requestedLocaleName`.
- After the user selects a result, request the same Place ID in the alternate locale only when the alternate name is needed.
- Display both names only when the source returns two non-empty, meaningfully distinct values.
- If the alternate name is missing or identical, display one name once.
- Do not transliterate, translate, or generate a missing hotel name.
- Label both names as source-provided, not as SafrBwai translations.

This design limits the bilingual lookup to the selected hotel instead of doubling every search request.

## Field masks and cost boundary

Google requires a field mask. Billing follows the highest SKU tier triggered by any requested field.

### Approved first release — Pro ceiling

Proposed Text Search field mask:

```text
places.id,
places.displayName,
places.formattedAddress,
places.location,
places.primaryType,
places.businessStatus,
places.googleMapsUri
```

`displayName`, `businessStatus`, `primaryType`, and `googleMapsUri` place Text Search in the Pro tier. At the price-list snapshot reviewed on 2026-08-01, Text Search Pro has a 5,000-call monthly free-usage cap, then a listed first paid tier of USD 32 per 1,000 calls. This is planning information, not a price guarantee.

### Deferred rating expansion — separate cost decision

The following fields raise the request to Enterprise:

```text
places.rating,
places.userRatingCount
```

At the same snapshot, Text Search Enterprise has a 1,000-call monthly free-usage cap, then a listed first paid tier of USD 35 per 1,000 calls. Rating and user rating count are not part of the first release. A future, independent cost decision and budget control are required before either field can be requested or displayed.

### Excluded fields

Do not request fields that the first UI does not display. In particular, exclude photos, reviews, review summaries, phone numbers, opening hours, website URI, amenities, price level, and generated summaries.

### Place Details

Use Place Details only for a selected Place ID and only with the smallest field mask needed for the alternate-locale display name. Do not call it for every search result.

## Credential and server security

Before any Preview or Production request is enabled:

- Create a dedicated server credential for SafrBwai; do not reuse a browser key.
- Restrict the credential to Places API (New).
- Apply an appropriate server-side application restriction supported by the deployment architecture. Google recommends IP restrictions for API-key web-service traffic; if stable outbound IP restriction is not available, the implementation cannot be activated until an approved secure server-authentication approach is documented.
- Store the credential only as a server-side secret. Never use a `NEXT_PUBLIC_` name.
- Use separate Preview and Production credentials or projects when the restriction and quota model requires isolation.
- Set low initial per-method quotas, billing budgets, and alerts before activation.
- Add an application rate limit stricter than the provider quota.
- Use short upstream timeouts and no automatic retry for billable search requests.
- Never put the key in a URL, browser storage, error payload, log, screenshot, test fixture, or PR.
- Rotate only through a documented operational procedure.

No credential or environment-variable change belongs in this specification PR.

## Privacy, storage, and logging

### Transmitted data

The submitted hotel name, optional city, and requested locale will be sent from the SafrBwai server to Google. Privacy and Terms pages must disclose this before the feature is enabled.

### Storage

- Do not persist search queries.
- Do not persist raw provider responses.
- Do not persist localized names, addresses, coordinates, ratings, rating counts, or source links in the first release.
- Place IDs are the only provider values eligible for long-term storage under the documented Places exception, but the first release does not need to store them.
- If Place IDs are stored later, record a refresh date and refresh IDs older than 12 months.
- Do not cache Places content unless a separate review confirms the exact permitted duration and use under the current terms.

### Logs

Allow only operational metadata:

- SafrBwai request ID.
- provider method name.
- status category or normalized error code.
- latency.
- result count.
- locale.

Do not log the hotel query, city, provider response, place name, address, coordinates, Place ID, rating, evidence, IP address, or user-agent as application data.

## Attribution and source integrity

- Display the official Google Maps attribution in the same visual container as Google-sourced content.
- Prefer the official Google Maps logo and follow its size, spacing, contrast, and accessibility rules.
- If text attribution is used where allowed, keep `Google Maps` unchanged and add `translate="no"`.
- Visually separate source content from SafrBwai explanations.
- Link `googleMapsUri` as the source record when returned.
- Do not describe the data as independently verified by SafrBwai.
- Do not display photos or reviews in the first release; those introduce additional attribution and policy duties.
- Update public Privacy and Terms pages to incorporate the required Google terms and privacy references before activation.

## Safe public response

The response should contain an allow-listed result envelope only:

```ts
type HotelSearchResponse = Readonly<{
  requestId: string;
  results: readonly SourcedHotel[];
  source: "google_places";
}>;
```

The exact route and schema must be finalized in the implementation PR. It must not return:

- the upstream response body;
- upstream request headers;
- upstream error text;
- field masks or credential identifiers;
- internal match confidence or observations;
- input echo;
- generated commentary;
- a fabricated result when the provider is disabled or unavailable.

## Failure behavior

| Condition | HTTP direction | User behavior | Retry behavior |
| --- | ---: | --- | --- |
| Capability/server flag off | 503 | “Hotel search is not currently enabled.” | No automatic retry |
| Invalid input | 400 | Localized validation message | User edits input |
| App rate limit | 429 | Safe message with retry countdown | No automatic retry |
| No eligible result | 200 | Empty state, refine name/city | User initiated |
| Ambiguous results | 200 | Show selection list | None |
| Provider authentication/configuration | 503 | Generic unavailable message + SafrBwai Request ID | No automatic retry |
| Provider quota/billing limit | 503 | Generic temporarily unavailable message + Request ID | No automatic retry |
| Provider timeout/network failure | 503 | Generic temporarily unavailable message + Request ID | No automatic retry |
| Invalid provider response | 503 | Generic temporarily unavailable message + Request ID | No automatic retry |

No failure may expose the upstream body, Google credential, stack trace, or submitted query. A failed lookup must never produce preview or synthetic hotel data.

## Capability and activation model

The implementation needs two independent controls:

1. A client-visible capability control that keeps the real submit UI hidden or disabled unless approved.
2. A server-only control that blocks provider calls even if a client request is crafted manually.

The existing `hotelOfferReview` capability must remain `preview` until the release delivers the behavior promised by that capability. A source-backed hotel lookup alone must not silently redefine “review” or enable unsupported value, authenticity, or fee analysis.

Acceptable rollout options for the implementation review are:

- add a narrower `hotelIdentityLookup` capability and enable it independently; or
- revise the visible route copy so it accurately promises only sourced hotel information while keeping unsupported review categories explicitly unavailable.

The implementation PR must choose one option and update capability tests. This specification does not change the registry.

## Test architecture

```text
Unit tests
  +-- input normalization and validation
  +-- locale and alternate-name rules
  +-- provider response schema and allow-list adapter
  +-- ambiguity and eligibility rules
  +-- error normalization
  +-- field-mask snapshot
  +-- no query/response logging

Integration tests with mocked provider transport
  +-- Arabic search
  +-- English search
  +-- alternate-locale selected-place lookup
  +-- no result / ambiguous / closed hotel
  +-- 429 / timeout / quota / invalid JSON
  +-- server flag off performs zero provider calls
  +-- raw provider body never reaches public API

Browser tests
  +-- Arabic RTL and English LTR
  +-- keyboard and screen-reader selection
  +-- 320px through 1440px without horizontal overflow
  +-- Google Maps attribution visible and accessible
  +-- source link safe and correct
  +-- no fabricated results during every failure mode

Production smoke after an approved activation
  +-- one synthetic Arabic query
  +-- one synthetic English query
  +-- disabled-state and rate-limit integrity
  +-- no client-side provider credential
  +-- no Runtime or JavaScript errors
```

Critical branches require direct tests, not only snapshots. Network tests must use a fake transport in CI; CI must never consume billable Places requests or require a real credential.

## Required acceptance cases

At minimum, the implementation must prove:

1. An Arabic hotel name plus city returns source-backed candidates.
2. An English hotel name plus city returns source-backed candidates.
3. Searching either language can resolve the same selected Place ID when the provider supports both queries.
4. Arabic and English display names are shown only when both are source-provided and distinct.
5. A missing alternate name is not invented.
6. Multiple hotels with similar names require selection.
7. City context prevents a silent match to another city.
8. A non-hotel result is not presented as a confirmed hotel.
9. A closed hotel displays its source status.
10. No result produces a real empty state, never demo output.
11. Provider disablement makes zero external calls and returns 503.
12. Provider failure returns only the safe application error and Request ID.
13. Rating and user rating count are absent from the first-release field mask, adapter, public API, and UI.
14. The field mask contains no unused field.
15. The public response contains no raw provider fields.
16. The browser bundle contains no provider secret.
17. Google Maps attribution remains visible on mobile and desktop.
18. Search and provider responses are not stored or logged.
19. Feedback stays hidden and disabled.
20. `noindex, nofollow`, robots blocking, and `ProductStage = prelaunch` remain unchanged.

## Operational gates

- [x] Google Places API (New) approved as the provider.
- [x] Pro identity fields approved as the first-release cost ceiling.
- [x] Rating and user rating count deferred to a separate cost decision.

The two pre-development design gates were completed by the consolidated Product Owner approval on 2026-08-21:

- [x] A viable server-side credential restriction or authentication model is documented and approved for the deployment architecture.
- [x] Privacy and Terms are updated and approved for the Google Places data transfer, policies, and attribution obligations.

Phase 6C-1 implementation may begin only after the consolidated review PR passes its required `lint`, `typecheck`, full test suite, and production `build` checks. This approval does not satisfy the separate activation gates below.

Before any real provider request is enabled in Preview or Production:

- [ ] Current pricing and terms are re-checked.
- [ ] Google Cloud billing owner is identified.
- [ ] Preview and Production credential model is approved.
- [ ] Initial quotas, budget, and billing alerts are documented.
- [ ] Google Maps attribution design is reviewed in Arabic, English, and at 390px.
- [ ] The capability wording decision is approved.

## Delivery sequence after approval

Each delivery should be a separate reviewed PR. No step authorizes the next automatically.

### 6C-1 — Provider boundary and server contract

- provider interface and Google adapter;
- validation, allow-list mapping, safe errors, request IDs, timeouts, and rate limits;
- mocked unit and integration tests;
- server feature disabled by default;
- no visible feature activation.

Implementation record: `docs/PHASE_6C_1_IMPLEMENTATION.md`.

### 6C-2 — Source-backed selection UI

- Arabic/English search and result selection;
- accurate scope copy;
- alternate-locale name behavior;
- attribution and source link;
- empty/error/ambiguous states;
- accessibility and responsive tests;
- still disabled in Production.

Implementation record: `docs/PHASE_6C_2_IMPLEMENTATION.md`.

### 6C-3 — Compliance and controlled activation

- approved Privacy and Terms changes;
- restricted credentials, quotas, budget, and alerts;
- Preview verification with non-sensitive synthetic searches;
- explicit production activation decision;
- post-deployment smoke test and rollback check.

Rating and user rating count require a separate cost-approved phase after the Pro identity release; they must not be added within 6C-1, 6C-2, or 6C-3.

## Rollback

Rollback is a server-side disable first:

1. Turn off the server capability so no provider request can be made.
2. Keep the UI in an accurate unavailable/preview state.
3. Confirm no billable traffic continues.
4. Investigate using operational metadata only.
5. Rotate the credential only if exposure or unauthorized use is confirmed.

Rollback must not replace failed real data with preview or synthetic results.

## Approval record

Approved on 2026-08-01:

1. **Official provider:** Google Places API (New).
2. **First-release cost tier:** Pro identity fields only.
3. **Deferred fields:** rating and user rating count require a separate cost decision.

The Product Owner completed both pre-development gates on 2026-08-21 (Asia/Riyadh):

1. **Server credential restriction:** the Vercel OIDC to Google Cloud Workload Identity Federation design is approved.
2. **Privacy and Terms:** the Arabic and English disclosures are approved as the Phase 6C product copy and implementation basis.

The approval is scoped by `docs/PHASE_6C_APPROVAL_RECORD.md`. It is Product Owner approval and does not represent independent external legal advice. The implementation must still choose accurate capability wording before exposing the UI. This choice belongs to the reviewed 6C implementation plan and cannot expand the approved Pro-only data scope.

Until the required consolidated PR checks pass, `/analyze-hotel` remains a non-factual Preview and Phase 6C remains specification-only. Passing those checks authorizes implementation review only; it does not authorize provider activation, production data transfer, indexing, or public launch.
