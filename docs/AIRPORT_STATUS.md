# Airport status ("حالة المطارات الآن")

Shown on `/insights` (مرصد السفر) in three presentations of one server-rendered snapshot:

| Width | Presentation | Component |
|---|---|---|
| < 768px | Slim banner on a native `<details>` (keyboard and screen-reader expand, no JS) | `AirportStatusBanner` |
| 768–1279px | Compact card in the content flow, Saudi and global side by side | `AirportStatusCard` |
| ≥ 1280px | Sticky sidebar (`top-24`, clears the sticky header; scrolls internally) | `AirportStatusSidebar` |

The page renders per request (`connection()` in the loader), so freshness is judged at
the time of each visit; ISR could otherwise serve old data as current. No client
JavaScript is added.

## Code map (`src/lib/airport-status/`)

| File | Role |
|---|---|
| `types.ts` | Normalized model (`AirportStatusRecord`, `AirportStatusSnapshot`, `StatusConflict`) |
| `config.ts` | Saudi airports shown (add AHB, GIZ, EAM here, no component edits), limits, approved authority hosts |
| `status.ts` | Arabic labels, mapping rules, staleness, Riyadh time formatting |
| `normalize.ts` | Validation and normalization of untrusted provider output; suspension and conflict rules |
| `providers.ts` | `AirportStatusProvider` interface: `ManualStatusProvider`, `RemoteFeedProvider` (authorized API or CMS export), `FixtureProvider` (development only) |
| `service.ts` | Server entry point: provider selection, fallback, last good data |
| `view.ts` | Snapshot → display model (summary, coverage, top-5 global) |
| `sources.ts` | Reference links shown to visitors (links only; nothing is scraped) |
| `fixtures.ts` | Sample records, flagged `sample: true`, pointing to example.com |

## Providers (first match wins)

| Mode | When | Notes |
|---|---|---|
| `fixture` | `AIRPORT_STATUS_FIXTURES=1` and `NODE_ENV !== "production"` | Labelled «بيانات تجريبية للتطوير». Refused in production; `sample: true` records are rejected outside development. |
| `authorized_api` | `AIRPORT_STATUS_FEED_URL` (https) and `AIRPORT_STATUS_FEED_KIND=authorized_api` | A licensed provider returning this feed shape. «مباشر» is shown only if `AIRPORT_STATUS_FEED_LIVE=1` as well, and only while the newest `fetchedAt` is at most 10 minutes old. |
| `cms_feed` | `AIRPORT_STATUS_FEED_URL` (https), any other kind | A CMS export maintained by a person. Never shown as live. |
| `manual_feed` | `manual-feed.json` has valid records | Reviewed by a person and deployed with the site. Never shown as live. |
| `unavailable` | nothing usable | «تعذر تحديث البيانات حاليًا» plus official links per Saudi airport. |

Remote calls are server-side only: 3 s timeout (not retried, so the page waits at most
one timeout; the route has no inner Suspense because a late swap above the list would
shift it), one retry on other network errors and 5xx
(never on 4xx), redirects refused, 512 KB cap, Next data cache 5 minutes, optional
`AIRPORT_STATUS_FEED_TOKEN` sent as a bearer token (plain env var, never `NEXT_PUBLIC_`).
Once a good response is cached, Next serves it and refreshes in the background, so an
outage shows up as aging records (rendered stale). Without a cached copy, the last good
response held by the server instance is shown (not live, labelled), then the manual feed.
An empty or wholly invalid response is a failed refresh, not an update.

**No licensed aviation API is configured.** Public URLs do not authorize scraping:
do not parse Flightradar24, airport or airline pages.

## Feed shape

```json
{
  "records": [
    {
      "airportCode": "JED",
      "airportNameAr": "مطار الملك عبدالعزيز الدولي",
      "cityAr": "جدة",
      "countryCode": "SA",
      "operationalStatus": "minor_delays",
      "delayPercentage": 22,
      "cancellationPercentage": 1,
      "averageDelayMinutes": 25,
      "cancelledFlights": 3,
      "statusMessageAr": "اختياري، حتى 160 حرفًا",
      "passengerActionAr": "اختياري، حتى 160 حرفًا",
      "source": { "name": "GACA", "url": "https://www.gaca.gov.sa/...", "type": "civil_aviation_authority" },
      "airlineStatus": { "name": "Saudia", "url": "https://..." },
      "observedAt": "2026-10-16T08:50:00Z",
      "fetchedAt": "2026-10-16T08:55:00Z",
      "expiresAt": "2026-10-16T10:50:00Z",
      "confidence": "high"
    }
  ]
}
```

- `region` is derived (`countryCode === "SA"` → saudi). `confidence` defaults to `high` for authoritative source types, `medium` otherwise; `low` records are shown but never summarised or ranked.
- `source.type`: `official_airport` | `civil_aviation_authority` | `airline_notice` | `approved_authority` | `flight_tracker` | `manual_review`.
- Timestamps are ISO 8601 with `Z` or an explicit offset (e.g. `+03:00`); a time without a zone is rejected. They must not be in the future; `fetchedAt` must not precede `observedAt`; `expiresAt` (optional, default `observedAt` + 3 h, capped at `observedAt` + 24 h) must follow `observedAt`. Expired records render as «بيانات قديمة — آخر حالة معروفة» and never count as current.
- Out-of-range figures are dropped individually. Text is length-limited and stripped of bidi controls. Links are https only, without credentials.
- The update time shown is the newest accepted `fetchedAt`, in Asia/Riyadh.

## Status rules

`normal` «يعمل بشكل طبيعي» · `minor_delays` «تأخيرات محدودة» · `major_disruption` «اضطراب مرتفع» ·
`suspended` «عمليات متوقفة» · `unavailable` «البيانات غير متاحة» (display only).

1. Without an explicit status, figures map to at most `major_disruption` (cancel ≥ 10% / delay ≥ 40% / avg ≥ 60 min) or `minor_delays` (≥ 3% / ≥ 15% / ≥ 20 min).
2. **`suspended` is never derived** from delays, cancellations, missing flights, empty results, tracking gaps or scores. It is accepted only with `suspensionEvidence` of an authoritative type on a government host (`*.gov`, `*.gov.xx`) or a host in `APPROVED_AUTHORITY_HOSTS` (add airport operators and airlines there, by a person).
3. Per airport, only each source's newest record counts (a reopening notice supersedes the same source's suspension notice).
4. Records from different sources within 90 minutes of the newest that disagree: the more cautious (more severe) status among current, non-low-confidence records is shown with «المصادر غير متطابقة…»; the claims go to the server log.
5. An unexpired unverified suspension claim at least as recent as the shown record: a verified `major_disruption` / `suspended` stays, with the note «ورد بلاغ بتوقف العمليات لم يُؤكَّد…»; a calmer verified status is withheld and the airport shows «البيانات غير متاحة» with the note.

The collapsed Saudi summary takes the worst current status of **any** Saudi airport in the feed (so a suspension at AHB is not missed); the coverage count refers to the configured list.

## Global list

At most 5 airports outside the configured Saudi list (including other Saudi airports),
status ≠ normal, current and not low-confidence, sorted by severity then recency.
Stale or missing data never ranks.

## Analytics

Not wired: the site's analytics abstraction has no consent gating, so the
`airport_status_*` events were not added.

## Known limitation

The route renders per request, and the root `src/app/loading.tsx` streams every
dynamic route, so with JavaScript **disabled** the visitor sees the loading spinner.
With JavaScript enabled but the bundles failing (hydration failure), the page and the
module still render and expand: the stream is revealed by inline scripts and the
expand control is a native `<details>`.
