# Phase 6C-2 — Source-backed selection UI implementation record

## Status

- Implementation branch: `codex/phase-6c-2-hotel-identity-ui`.
- PR: #41, merged into `claude/demo-integrity-fixes` on 2026-10-08 (Asia/Riyadh).
- Reviewed head: `720445d4c3e3bd1c8c115d025c7d9f232abf5eb3`.
- Merge commit: `5518a8a352f4e464847cafb89f277a7ee53e41c7`.
- Product stage: `prelaunch`.
- Visible hotel feature: identity-lookup interface shown in a disabled state.
- Google Places server capability: disabled by default.
- Real or billable Google calls during development, CI, and verification: none.

## Delivered interface

- `/analyze-hotel` now presents a source-backed hotel identity lookup instead of a hotel-offer review preview.
- The page enables the form only when both controls agree: the `hotelIdentityLookup` capability is `enabled` and the server flag `HOTEL_IDENTITY_LOOKUP_ENABLED` is exactly `true`. Today the capability is `preview`, so the hotel-name input, city input, and submit button render disabled with a localized notice that nothing is sent to Google.
- Search states: idle, loading, results, empty, and error (`invalid`, `rateLimited`, `unavailable`). A failed or empty lookup never falls back to preview or synthetic hotels.
- More than one eligible result shows an explicit ambiguity notice and requires user selection; no result is auto-selected.
- The selected hotel shows the requested-locale name, address, business status, Google Maps attribution, and the `googleMapsUri` source link when returned.
- The client re-validates every public response and accepts source links only on `https://maps.google.com` or `https://www.google.com/maps`.
- Results use `aria-live="polite"`, `aria-busy`, labelled sections, and focus moves to the result region after a search.

## Capability wording decision

The spec offered two options. This phase added a narrower `hotelIdentityLookup` capability (status `preview`, not required for public launch) and left `hotelOfferReview` unchanged. Route metadata, guide copy, and dictionaries now promise only source-backed identity, with no ratings, prices, or recommendations.

The wording itself still needs Product Owner approval under the activation gate.

## Alternate-locale name

- `POST /api/hotels/name` returns the selected place's name in the alternate locale. It uses the `hotel-name.v1` envelope, rejects unknown fields, accepts only `placeId` (`[A-Za-z0-9_-]`, at most 256 characters) and `locale` (`ar` or `en`), and caps the body at 512 bytes.
- The disabled branch returns `503 HOTEL_SEARCH_DISABLED` before rate limiting, body parsing, or provider construction. The route shares the hotel-search rate limiter.
- Place Details still requests only `id,displayName`.
- The provider keeps `displayName.languageCode` and returns `{ text, languageCode }` only when the code is `ar` or `en`; anything else, including a missing code, becomes `null`.
- The server contract allows only the `text` and `languageCode` keys and fails closed on anything else.
- The UI renders the alternate name only when its source language equals the requested alternate locale and the text differs from the primary name. The `lang` attribute uses the source language. A Google fallback in the other language, an unknown code, or a missing code is not rendered, and no name is translated, transliterated, or generated.

## Verification

At the reviewed head:

- Typecheck, lint, production build, and `git diff --check` passed.
- Full suite: 592/592 tests in 80 files. Regression: 41/41.
- GitHub CI and Vercel checks passed.
- Canonical Preview verified Arabic and English at 390×844 and 1440×900 with zero `/api/hotels/*` requests.

After merge, on `https://www.safrbwai.com/analyze-hotel` (Production deployment for the merge commit):

- Arabic RTL and English LTR at 390×844 and 1440×900, with no horizontal scroll.
- Two disabled inputs and a disabled submit button; zero `/api/hotels/*` requests on load.
- A direct `POST /api/hotels/name` returned `503 HOTEL_SEARCH_DISABLED`.
- `noindex, nofollow` unchanged; no application console errors.

## Open items for 6C-3

All three were resolved in the 6C-3 Preview-readiness PR (branch `claude/phase-6c-3-preview-readiness`):

- Attribution was the text `Google Maps`. Google's policy requires the logo "whenever possible", and the Product Owner chose the official logo on 2026-10-08. The UI now shows the unmodified logo from `Google_Maps_Attribution_Assets.zip`: gray in light mode, white in dark mode, 18px high, with the required clear space. The attribution design-review gate still requires visual review in Arabic, English, and at 390px on Preview.
- Google documents `displayName.languageCode` as BCP-47 ("en-US", "sr-Latn"). The provider now reduces a well-formed tag to its primary language, so region-qualified Arabic and English names are no longer dropped.
- `/api/hotels/name` now returns `localizedName: null` when the source language differs from the requested locale, so a fallback-language name never leaves the server.

## Explicit non-authorization

This implementation does not create Google Cloud resources, alter Vercel settings, add environment values, enable billing, make a real Places request, enable the capability, change `ProductStage`, enable indexing, or authorize Preview or Production activation. Those actions remain gated by the unchecked controls in `docs/PHASE_6C_HOTEL_DATA_SPEC.md`.
