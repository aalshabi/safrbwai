# Nondeterminism / environment notes (homepage baseline, commit a091568)

Source of every HTML/visual artifact here: a LOCAL `next build && next start` of a091568
(an isolated copy outside the repo via `git archive`, node_modules symlinked). Live
https://www.safrbwai.com/ was NOT reachable: the session egress proxy refused the CONNECT (HTTP 403,
policy denial). See live-fetch-attempt.headers.txt.

Nondeterministic / build-dependent parts of home.local.html (exclude these from any HTML diff gate):
- Build ID (`JShowPubrE4jIF-JDyOwx`) embedded once in the RSC payload. It changes on every build.
- `/_next/static/chunks/*-<hash>.js`, `/_next/static/css/<hash>.css`, `/_next/static/media/*.woff2` names.
  These are content hashes, stable while the deps are unchanged but can differ across Next/toolchain versions.
- Icon query strings `/icon.svg?571acb6d5ce8dc2a` and `/apple-icon.png?f7246ac3b09c9614` are content hashes.
- Response headers ETag / Date. Two back-to-back local fetches gave byte-identical HTML.
- No nonces are present: the CSP uses 'unsafe-inline' with no nonce pipeline. No timestamps were found in the HTML.

Environment-dependent output (local may differ from Vercel production):
- `robots` meta comes from `SITE_ROBOTS` = publicIndexing capability && !preview (VERCEL_ENV). Locally it is "index, follow".
- Canonical, og:url and alternates come from NEXT_PUBLIC_SITE_URL, falling back to https://www.safrbwai.com. Locally the fallback applied.
- The Vercel Web Analytics script is injected only when NEXT_PUBLIC_VERCEL_ENV and related vars are set, so it is absent locally.
- Supabase env vars are absent locally, so middleware runs in demo mode. The homepage itself does not depend on them.

Structure facts worth knowing:
- `src/app/loading.tsx` wraps the page in Suspense. In the RAW HTML the main content is streamed after the
  footer (hidden S:0 template), so raw heading order starts with the footer h3s. The rendered DOM order starts
  with the h1. metadata.local.json keeps both orders.
- Insight dates on the homepage are hardcoded data in src/lib/travel-insights.ts. The homepage components and
  footer have no Date.now()/new Date(), and the route is static (prerendered).
- Tailwind scans ./src/**/*.{ts,tsx}, so a className change in ANY src file can change the shared CSS bundle
  and the homepage. deps.sha256 does not cover that. A visual or CSS-hash gate is needed in addition.

Addendum (orchestrator, 2026-10-19): the live homepage was later fetched through the Vercel MCP
`web_fetch_vercel_url` tool (status 200). After normalizing build-hashed asset names, its <html> attributes,
<title>, all <meta> tags, canonical/alternate/icon/manifest links, JSON-LD and H1 are identical to the local
build (metadata.live.json vs metadata.local.json). The live CSS bundle is the same file as the local one
(css-bundles.txt: /_next/static/css/51093e44739e7ce0.css). The live screenshots were not captured; the visual
baseline is the local build of the same commit.
