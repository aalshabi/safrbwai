# Phase 6C-1 — Provider boundary implementation record

## Status

- Implementation branch: `codex/phase-6c-1-provider-boundary`.
- Base: merged Phase 6C approval commit `7b1ce0af65808b804d1746283b51ce063092b1e1`.
- Product stage: `prelaunch`.
- Visible hotel feature: unchanged Preview.
- Google Places server capability: disabled by default.
- Real or billable Google calls during development and CI: prohibited.

## Delivered boundary

- `POST /api/hotels/search` is the server contract for a future hotel-identity UI.
- The route returns `503 HOTEL_SEARCH_DISABLED` unless `HOTEL_IDENTITY_LOOKUP_ENABLED` is exactly `true`.
- The disabled branch executes before body parsing, provider construction, configuration loading, OIDC retrieval, or any provider transport.
- The public response is an allow-listed `hotel-search.v1` envelope and never echoes input or provider diagnostics.
- Validation rejects unknown fields, URLs, control characters, secret-like input, payment-like digit sequences, oversized bodies, unsupported locales, and invalid lengths.
- Per-client rate limiting is independent and stricter than the future provider quota. The shared in-memory limiter now has a bounded distinct-key set and queue-based expiry cleanup.
- No search query, city, OIDC token, Google access token, request header, or upstream response body is logged or stored.

## Authentication boundary

The implementation uses the approved chain:

```text
Vercel request-scoped OIDC token
  -> cryptographic verification against Vercel JWKS
  -> exact team, project, environment, issuer, audience and subject checks
  -> Google Workload Identity Federation
  -> dedicated service-account impersonation
  -> 10-minute method-scoped Google OAuth access token
```

The implementation uses `@vercel/oidc` and `google-auth-library`. It constructs all Google token endpoints in code; none can be supplied by user input or environment variables. It accepts only these final access-token scopes:

- `https://www.googleapis.com/auth/maps-platform.places.textsearch`
- `https://www.googleapis.com/auth/maps-platform.places.details`

The library uses the IAM-compatible source scope only for the Workload Identity Federation impersonation step, then requests the exact method-specific scope for the final service-account access token. No API key or service-account private key is supported.

## Google Places boundary

Text Search uses one request, no automatic retry, a short timeout, and this exact field mask:

```text
places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.businessStatus,places.googleMapsUri
```

Place Details is available only for a selected Place ID and requests `id,displayName`. The adapter:

- filters non-lodging primary types;
- validates identifiers, names, coordinates, status, and Google Maps source links;
- preserves provider order and ambiguity;
- returns an empty array for a real empty result;
- never invents an alternate-locale name;
- excludes ratings, review counts, reviews, photos, prices, availability, and all unknown upstream fields;
- discards upstream error bodies and emits only normalized internal errors.

## Configuration contract

The repository contains names only, never values:

```text
HOTEL_IDENTITY_LOOKUP_ENABLED=false
GCP_PROJECT_NUMBER=
GCP_WORKLOAD_IDENTITY_POOL_ID=
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=
GCP_SERVICE_ACCOUNT_EMAIL=
HOTEL_SEARCH_RATE_LIMIT_MAX=3
HOTEL_SEARCH_RATE_LIMIT_WINDOW_MS=60000
```

`VERCEL_PROJECT_ID` and the deployment environment are obtained from Vercel's runtime. Only `preview` and `production` identities are accepted, and their exact `sub` values cannot be used interchangeably.

Correction (2026-10-08, Phase 6C-3): Vercel does not expose `VERCEL_TEAM_ID` as a system environment variable, although this record originally said it did. Without it, configuration fails closed with `PROVIDER_CONFIG` before any provider call. `VERCEL_TEAM_ID` must be set explicitly, to the team identifier, in every environment where the lookup is enabled. See `docs/PHASE_6C_3_PROGRESS.md`.

## Verification scope

All automated provider tests use injected fake transports and synthetic data. They cover:

- disabled route with zero provider construction or calls;
- Arabic and English input normalization;
- Preview/Production identity isolation;
- exact OAuth scopes and fixed token endpoints;
- exact field masks and absence of API-key headers;
- allow-list mapping, ambiguity, non-hotel filtering, empty results, and closed status;
- missing alternate names without generated replacements;
- safe mapping for authentication, quota, HTTP, network, timeout-shaped, invalid JSON, invalid link, and missing-configuration failures;
- no raw provider content or user query in public errors or logs;
- hard request-size and rate limits.

## Explicit non-authorization

This implementation does not create Google Cloud resources, alter Vercel settings, add environment values, enable billing, make a real Places request, activate the UI, change `ProductStage`, enable indexing, or authorize Preview or Production activation. Those actions remain gated by the unchecked controls in `docs/PHASE_6C_HOTEL_DATA_SPEC.md`.
