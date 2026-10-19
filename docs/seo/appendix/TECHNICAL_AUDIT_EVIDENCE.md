# safrbwai.com — Technical SEO Audit (read-only)

> **Editor's note (2026-10-19, final package):**
> - Raw specialist output, kept as evidence.
> - The deployment-to-commit link was verified separately: Vercel `get_deployment dpl_62qPXCtAAy3fT264B6RhHzkuxDyd` shows commit `a0915684`, READY and aliased to www.safrbwai.com (`../SEO_TEST_RESULTS.md` #1).
> - The independent review corrected the following counts. `../SEO_AUDIT_AR.md` uses the corrected figures.
>   - **og:url → homepage:** on 9 of 12 indexable non-home URLs. The "13" below counts all 16 responses, including `/`, the 404 and noindex pages.
>   - **Hidden S:0 streaming:** on 12 of 13 sitemap URLs (all except `/guides`).
> - "insight-card.tsx is used only by /insights" (finding 4) is wrong: `home/latest-insights.tsx` renders it on `/`.


- Date: 2026-10-19 (UTC ~02:15)
- Code: branch `seo/audit-phase1` @ `a091568`, checkout at `<repo checkout>`
- Live: build id `Azk3JC3umEph_Zfv0GCHT`, deployment `dpl_62qPXCtAAy3fT264B6RhHzkuxDyd` (from HTML comment and `?dpl=` asset query strings). I did not independently verify that this deployment is commit a091568. That comes from the brief. Its metadata output matched the a091568 build byte-for-byte on every page I compared (see Method).
- Nothing was edited, built, pushed or changed. Scratch artifacts were kept outside the repo (`scripts/parse_html.py`, `local.jsonl`, `raw/live-home.html`, `raw/live-insights.html`).

## Method and its limits

1. **`curl` to the site does not work from this sandbox.** The egress proxy refuses the host:
   ```
   $ curl -sS -D - https://www.safrbwai.com/robots.txt
   HTTP/1.1 403 Forbidden ... curl: (56) CONNECT tunnel failed, response 403
   [agent-proxy] www.safrbwai.com:443 — connect_rejected
   ```
   `WebFetch` also failed (`getaddrinfo ENOTFOUND www.safrbwai.com`). DNS tools (`dig` and `nslookup`) are not installed.
2. **Live evidence** therefore comes from the Vercel MCP tool `web_fetch_vercel_url`, which returns the raw status, headers and body. It was used to fetch: `/robots.txt`, `/sitemap.xml`, `/`, `/guides/transit-and-baggage`, `/insights`, `/insights/verify-hotel-booking-site`, `/terms/`, `/no-such-page-seo-audit-7x`, `https://safrbwai.com/robots.txt`, `http://safrbwai.com/` and `http://www.safrbwai.com/robots.txt`. Notes on the tool:
   - It adds `?_vercel_share=…` to redirect `Location` headers. That parameter comes from the tool, not the site.
   - It appears to follow same-host redirects silently. For `/terms/` it returned the final 200 with `x-matched-path: /terms`, so I could not observe the trailing-slash redirect code.
3. **The remaining routes** (`/analyze-offer`, `/analyze-hotel`, `/analyze-destination`, `/compare-hotels`, `/guides`, two of the guides, two of the insights, `/knowledge`, `/privacy`) were read from the production-commit build output already in the checkout (`.next/server/app/*.html`, BUILD_ID `c1_WobGUtG3Yo_R8etQQT`, built 2026-10-19 02:06 UTC; I did not run this build). They were parsed with a local HTML parser script (kept outside the repo).
   - **Parity check:** on the 5 pages fetched both live and from the build (`/`, `/guides/transit-and-baggage`, `/insights/verify-hotel-booking-site`, `/terms`, 404), the title, description, canonical, robots, hreflang, OG, H1 and JSON-LD were identical. Only the chunk hashes and `?dpl=` strings differed.
   - **Not fetched live:** the 8 other sitemap URLs. Each would put roughly 15k tokens of raw HTML into context through the MCP tool. They are listed as static prerenders in `prod/.next/prerender-manifest.json`, so they are expected to return 200, but **live status for those 8 is inferred, not observed**.
4. **Lighthouse and CWV:** not available. `node_modules/.bin` has no lighthouse, there is no Chrome or Chromium binary, and the site is unreachable from the sandbox. **No CWV numbers are given.**
5. **DNS TXT** (a possible GSC domain verification): not checkable. `dig` is missing, and Vercel `get_records` returned `403 forbidden: You don't have permission to list the domain record`.

---

## 1. robots.txt and sitemap.xml (live)

**robots.txt**: `web_fetch_vercel_url https://www.safrbwai.com/robots.txt` returns `200`, `content-type: text/plain`, `x-vercel-cache: PRERENDER`:
```
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /auth
Disallow: /dashboard

Sitemap: https://www.safrbwai.com/sitemap.xml
```
- The file is valid and matches `src/app/robots.ts:14-21`.
- Indexing is gated by `isIndexable()` (`src/lib/seo.ts:12-14`). That requires `publicIndexing.status === "enabled"` (`src/lib/product/capabilities.ts:232-234`, currently enabled) and a non-preview deployment.
- Note: `/admin`, `/auth` and `/dashboard` are both disallowed and set to `noindex`. Because crawling is blocked, Google never sees the `noindex`. If those URLs are linked externally, they can still be indexed as URL-only results. Impact is very low.

**sitemap.xml**: `web_fetch_vercel_url https://www.safrbwai.com/sitemap.xml` returns `200`, `application/xml`, `content-encoding: br`, `x-vercel-cache: PRERENDER`. It is valid sitemaps.org XML with 13 URLs:
```
https://www.safrbwai.com                      priority 1
/analyze-offer  /analyze-hotel  /guides
/guides/total-price-and-inclusions  /guides/cancellation-and-changes  /guides/transit-and-baggage
/insights
/insights/verify-hotel-booking-site  /insights/award-winning-hotel-fit  /insights/ai-trip-planning-human-review
/privacy  /terms                               priority 0.8, changefreq weekly
```
- **`lastmod` is not real.** Every entry is `<lastmod>2026-10-19T02:10:36.243Z</lastmod>`. The cause is `src/app/sitemap.ts:20-23` (`const now = new Date(); … lastModified: now`), and the route is statically prerendered (`/sitemap.xml` is in `prerender-manifest.json`, served as `PRERENDER`). So `lastmod` equals the **build/deploy time** and changes on every deploy even when content does not.
  - The real dates already exist in code: guides have `reviewedAt` (rendered on page, e.g. `<time dateTime="2026-09-27">`), and insights have `publishedAt`/`reviewedAt` (`2026-10-14`).
- `changefreq` and `priority` are ignored by Google. They are harmless.
- **Self-canonical check:** all 13 `<loc>` values equal the page's `<link rel="canonical">`. Home is `https://www.safrbwai.com` with no trailing slash in both places. Five of these were verified live, eight from the build (see table).
- **Status:** 200 was observed live for `/`, `/guides/transit-and-baggage`, `/insights`, `/insights/verify-hotel-booking-site` and `/terms`. It is inferred from the prerender manifest for the other 8.
- **Coverage:** the sitemap correctly excludes the noindex pages (`/analyze-destination`, `/compare-hotels`, `/knowledge`) and the private pages. No indexable public page is missing.

## 2. Per-route metadata

Legend:
- **Src**: "live" means fetched from production; "build" means parsed from the a091568 build HTML.
- **OG url/title**: "(root)/site" means `og:url=https://www.safrbwai.com` and `og:title="سافر بوعي — SafrBwai"`, both inherited from the root layout.
- **T** and **D** are title and meta description lengths in characters.

| Route | HTTP | T | D | Canonical | robots meta | hreflang | og:url / og:title | lang/dir | H1 count: text | JSON-LD | og:image | HTML | Src |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 50 | 202 | (root) | index, follow | ar→(root); en→(root) | (root) / site | ar/rtl | 1: قبل لا تدفع… افهم قرار سفرك. | WebSite | no | 94 KB | live |
| `/analyze-offer` | 200* | 53 | 204 | /analyze-offer | index, follow | — | (root) / site | ar/rtl | 1: حلّل عرض سفرك | — | no | 37 KB | build |
| `/analyze-hotel` | 200* | 51 | 145 | /analyze-hotel | index, follow | — | (root) / site | ar/rtl | 1: بحث هوية الفندق | — | no | 31 KB | build |
| `/analyze-destination` | 200* | 54 | 135 | /analyze-destination | **noindex, follow** | — | (root) / site | ar/rtl | 1: مراجعة الوجهة | — | no | 33 KB | build |
| `/compare-hotels` | 200* | 60 | 150 | /compare-hotels | **noindex, follow** | — | (root) / site | ar/rtl | 1: مقارنة الفنادق | — | no | 31 KB | build |
| `/guides` | 200* | 56 | 83 | /guides | index, follow | — | (root) / site | ar/rtl | 1: أدلة مراجعة عرض السفر | — | no | 37 KB | build |
| `/guides/cancellation-and-changes` | 200* | 88 | 49 | self | index, follow | — | (root) / site | ar/rtl | 1: راجع الإلغاء والتعديل والاسترداد | — | no | 34 KB | build |
| `/guides/total-price-and-inclusions` | 200* | 86 | 59 | self | index, follow | — | (root) / site | ar/rtl | 1: راجع السعر النهائي وما يشمله العرض | — | no | 35 KB | build |
| `/guides/transit-and-baggage` | 200 | 89 | 60 | self | index, follow | — | (root) / site | ar/rtl | 1: راجع الترانزيت والأمتعة قبل الحجز | — | no | 35 KB | live |
| `/insights` | 200 | 54 | 75 | /insights | index, follow | — | (root) / site | ar/rtl | 1: مواضيع تساعدك على السفر بوعي | ItemList | no | **177 KB** | live |
| `/insights/ai-trip-planning-human-review` | 200* | 106 | 95 | self | index, follow | — | self / page | ar/rtl | 1: الذكاء الاصطناعي خطط رحلتك… من يراجع الأخطاء؟ | Article | no | 42 KB | build |
| `/insights/award-winning-hotel-fit` | 200* | 104 | 97 | self | index, follow | — | self / page | ar/rtl | 1: فندق فائز عالميًا… هل هو الأنسب لرحلتك؟ | Article | no | 42 KB | build |
| `/insights/verify-hotel-booking-site` | 200 | 105 | 97 | self | index, follow | — | self / page | ar/rtl | 1: هل حجزت من موقع الفندق الرسمي فعلًا؟ | Article | no | 42 KB | live |
| `/knowledge` | 200* | 55 | 153 | /knowledge | **noindex, follow** | — | (root) / site | ar/rtl | 1: محرك معرفة السفر | — | no | 66 KB | build |
| `/privacy` | 200* | 43 | 65 | /privacy | index, follow | — | (root) / site | ar/rtl | 1: سياسة الخصوصية | — | no | 38 KB | build |
| `/terms` | 200 | 48 | 70 | /terms | index, follow | — | (root) / site | ar/rtl | 1: الشروط والأحكام | — | no | 35 KB | live |
| `/no-such-page-seo-audit-7x` | **404** | 50 | 202 | **(root)** | **noindex** + index, follow | ar→(root); en→(root) | (root) / site | ar/rtl | 1: الصفحة غير موجودة · Page not found | — | no | 28 KB | live |

\* 200 is inferred from the build's prerender manifest. Live status was not observed (see Method §3).

### The canonical suspicion is NOT confirmed

`src/app/layout.tsx:73-79` sets `alternates: { canonical: "/", languages: { ar: "/", en: "/" } }`. However, **every public page except `/` defines its own `alternates.canonical`**, so non-home pages do **not** inherit canonical `/`. Live evidence:
- `/guides/transit-and-baggage` contains `<link rel="canonical" href="https://www.safrbwai.com/guides/transit-and-baggage"/>`
- `/terms` contains `<link rel="canonical" href="https://www.safrbwai.com/terms"/>`
- `/insights` contains canonical `https://www.safrbwai.com/insights`
- `/insights/verify-hotel-booking-site` contains canonical `https://www.safrbwai.com/insights/verify-hotel-booking-site`

Pages that define `alternates.canonical`:

| Route | Source |
|---|---|
| `/analyze-offer` | `src/app/analyze-offer/page.tsx:8` |
| `/analyze-hotel` | `src/app/analyze-hotel/page.tsx:13` |
| `/analyze-destination` | `src/app/analyze-destination/page.tsx:10` |
| `/compare-hotels` | `src/app/compare-hotels/page.tsx:10` |
| `/guides` | `src/app/guides/page.tsx:8` |
| `/guides/[slug]` | `src/app/guides/[slug]/page.tsx:18` |
| `/insights` | `src/app/insights/page.tsx:13` |
| `/insights/[slug]` | `src/app/insights/[slug]/page.tsx:19` |
| `/knowledge` | `src/app/knowledge/page.tsx:10` |
| `/privacy` | `src/app/privacy/page.tsx:7` |
| `/terms` | `src/app/terms/page.tsx:7` |
| `/admin`, `/auth`, `/dashboard` | their own `page.tsx` files |

Two side effects of Next.js's shallow metadata merge, where a child `alternates` replaces the root object entirely:
- **hreflang appears only on `/` and on the 404 page.** Child pages carry no hreflang at all.
- **The 404 page inherits canonical = homepage plus the root hreflang** (live: `<link rel="canonical" href="https://www.safrbwai.com"/>` on the 404 response). Because the status is 404, Google ignores it, so impact is minimal.

What **is** inherited site-wide is the root `openGraph` and `twitter` blocks (`src/app/layout.tsx:46-61`). On 13 of the 16 HTML responses, `og:url` is the homepage and `og:title`/`og:description` are the site-wide strings. Live, on `/guides/transit-and-baggage`:
```
<meta property="og:title" content="سافر بوعي — SafrBwai"/>
<meta property="og:url" content="https://www.safrbwai.com"/>
```
Only `insights/[slug]` overrides `openGraph` (`src/app/insights/[slug]/page.tsx:20-27`). Because the merge is shallow, those pages then **lose** `og:site_name` and `og:locale`. Live, the insight page has no `og:site_name` and no `og:locale`. `twitter:title` and `twitter:description` are the site-wide strings on **all** pages, including insights. Live insight page:
```
<meta name="twitter:title" content="سافر بوعي — SafrBwai"/>
```

### Pages that define their own metadata (item 10)

| File | Exports | Fields set |
|---|---|---|
| `src/app/layout.tsx` | `metadata` | metadataBase, title default and template `"%s \| سافر بوعي"`, description, keywords, authors, creator, openGraph, twitter, robots, appleWebApp, alternates |
| `src/app/page.tsx` (home) | **none** | inherits everything from the root layout; it only adds a WebSite JSON-LD (lines 13-20) |
| `analyze-offer`, `analyze-hotel`, `guides`, `insights`, `privacy`, `terms` page.tsx | `metadata` | title, description, canonical |
| `analyze-destination`, `compare-hotels`, `knowledge` page.tsx | `metadata` | title, description, canonical, `robots: PREVIEW_PAGE_ROBOTS` (noindex, follow) |
| `guides/[slug]/page.tsx:12-20` | `generateMetadata` | title, description (Arabic only), canonical. No openGraph. |
| `insights/[slug]/page.tsx:13-29` | `generateMetadata` | title, description, canonical, openGraph (article, published and modified time, url) |
| `admin`, `auth`, `dashboard` page.tsx | `metadata` | noindex, nofollow, canonical |
| `not-found.tsx` | none | Next.js injects `<meta name="robots" content="noindex">` in addition to the inherited `index, follow`, so the page carries two robots metas |

Other SEO library files:
- `src/lib/site-url.ts:8` sets `SITE_URL = NEXT_PUBLIC_SITE_URL || "https://www.safrbwai.com"`. The fallback is defined at `src/lib/result-actions/format-questions.ts:5`.
- `src/lib/seo.ts` defines `isIndexable`, `SITE_ROBOTS`, `PREVIEW_PAGE_ROBOTS` and `SITE_TITLE_*`/`SITE_DESCRIPTION`. These constants are partly duplicated as literals in `layout.tsx`.

## 3. Titles and descriptions

- **Titles too long** (Google truncates at about 600px, roughly 55-60 Latin characters; Arabic glyph widths vary, so this is approximate). The bilingual "AR — EN | سافر بوعي" pattern makes them long:
  - guides: 86-89 characters, e.g. `راجع الترانزيت والأمتعة قبل الحجز — Review transit and baggage before booking | سافر بوعي`
  - insights: 104-106 characters, e.g. `هل حجزت من موقع الفندق الرسمي فعلًا؟ — Did you actually book on the hotel's official website? | سافر بوعي`
  - The Arabic keyword phrase comes first, so the truncated SERP title still shows it. The English half and the brand suffix will be cut.
- **Descriptions:**
  - Too short on guide pages: 49, 59 and 60 characters (e.g. `أسئلة عملية لتعرف التزامك المالي قبل تأكيد العرض.`). They also reuse the on-page lead paragraph verbatim.
  - Long on `/` (202) and `/analyze-offer` (204), because they concatenate Arabic and English. The English half will be truncated.
- **Duplicates:** `<title>` and meta description are **unique per page**. The 404 page reuses the home title and description, which is acceptable.
- **Duplicate OG/Twitter:** `og:title` and `og:description` are identical on 13 of 16 pages, and `twitter:title` and `twitter:description` are identical on all of them (see §2).
- `meta keywords` is emitted site-wide (`layout.tsx:34-43`) and is ignored by Google. It also includes internal-sounding terms ("rule-based analysis", "text travel offer").

## 4. Redirects

| Request | Observed | Evidence |
|---|---|---|
| `http://www.safrbwai.com/robots.txt` | **308** → `https://www.safrbwai.com/robots.txt` | `status: 308`, `location: https://www.safrbwai.com/robots.txt?_vercel_share=…` (the query string comes from the tool) |
| `http://safrbwai.com/` | **308** → `https://safrbwai.com/` | `status: 308`, `location: https://safrbwai.com/?_vercel_share=…` |
| `https://safrbwai.com/robots.txt` | **308** → `https://www.safrbwai.com/robots.txt` | `status: 308`, `location: https://www.safrbwai.com/robots.txt?…`, `strict-transport-security: max-age=63072000` |
| `https://www.safrbwai.com/terms/` | final 200 served from `x-matched-path: /terms` | The tool followed the redirect, so the hop code was not observable. `next.config.mjs` has no `trailingSlash`, so Next.js defaults to redirecting `/x/` to `/x` with a 308 (inferred). |

Summary:
- **www is the primary host.** Apex redirects to www with a 308.
- `http://safrbwai.com` takes **2 hops** (http→https on the apex, then apex→www). That is fine but could be one hop.
- **HSTS:** on www, `max-age=63072000; includeSubDomains; preload` (from `next.config.mjs:37`). The apex redirect response sends only `max-age=63072000`, which is Vercel's edge default. For HSTS preload-list eligibility, the apex must send `includeSubDomains; preload`.

## 5. Rendering (is content in the server HTML?)

- **Yes, the content is in the initial HTML, but it sits in a hidden streamed block, not inside `<main>`.** On every page except `/guides`, `/auth` and the 404, `<main>` contains only the `src/app/loading.tsx` spinner. The real page body arrives later in `<div hidden id="S:0">`, after the footer, and an inline script moves it in. Live `/guides/transit-and-baggage`:
  ```
  <main class="flex-1"><!--$?--><template id="B:0"></template><div class="grid min-h-[100dvh] place-items-center"><div class="size-8 animate-spin …"></div></div><!--/$--></main><footer …>…
  <div hidden id="S:0"><article class="container py-14 md:py-20">…<h1 …>راجع الترانزيت والأمتعة قبل الحجز</h1>…
  …$RC("B:0","S:0")
  ```
  - Live insight page: the same pattern, and the Article JSON-LD is inside the hidden `S:0` block.
  - Build files with this pattern (`grep 'hidden id="S:0"'`): index, analyze-*, compare-hotels, knowledge, privacy, terms, all 3 guides and all 3 insights. Live `/insights` shows it as well.
- **Cause:** the root `src/app/loading.tsx` adds a Suspense boundary around every route. Even fully prerendered pages emit the fallback first. The swap script in the delivered HTML includes `setTimeout($RV…, … $RT+300-a)`, which can **hold the reveal for up to about 300 ms after first paint**. That is a plausible LCP cost, but I did not measure it.
- **Impact:**
  - Googlebot renders JavaScript and will see the content, and the text is present in the raw HTML. Non-JS consumers (many AI crawlers, link-preview bots, some SEO tools) see a spinner inside `<main>` and the article inside a `hidden` div. Many text extractors discard `hidden` content.
  - Mobile UX: a full-viewport spinner (`min-h-[100dvh]`) is painted before the content.
- **Fix scope:** removing or narrowing the root `loading.tsx` changes rendering for the **homepage too**. This conflicts with "homepage unchanged".
  - An option that leaves the homepage alone is to move only the async-feed route (`/insights`) under its own loading boundary. But a root `loading.tsx` cannot be opted out of per child route without restructuring, for example route groups with separate layouts. That restructuring **touches the root layout/loading**, so **flag it for a decision**.
- `/insights` is **fully dynamic**: `src/components/airport-status/airport-status-loader.tsx:11` calls `await connection()`. Live headers: `cache-control: private, no-cache, no-store, max-age=0, must-revalidate`, `x-vercel-cache: MISS`, HTML 177 KB (`raw/live-insights.html`). Every crawl hits the function, with no CDN cache.

## 6. Internal linking

Site chrome is identical on every page and gives 17 internal links:
- logo `/` twice
- desktop nav: `/analyze-offer`, `/guides`, `/analyze-hotel`, `/insights`
- mobile nav: the same 4 again
- footer: `/analyze-offer`, `/guides`, `/analyze-hotel`, `/#about`, `/insights`, `/privacy`, `/terms`

So **the `/guides` and `/insights` hubs are linked from nav and footer on every page.** The `/#about` target exists (`src/components/home/pillars.tsx:10`, `id="about"`).

Body links beyond the chrome (from `local.jsonl` and live `/insights`):

| Page | Internal body links | Anchor text |
|---|---|---|
| `/` | 3 links to `/insights/*`, plus extra links to `/analyze-offer`, `/guides`, `/analyze-hotel` and `/insights` | **"اقرأ الموضوع" ×3** (generic) |
| `/guides` | 3 links to `/guides/*` (`src/components/guides/guide-list.tsx:27`) | **"اقرأ الدليل" ×3** (generic) |
| `/insights` | 3 links to `/insights/*` (`src/components/insights/insight-card.tsx:39-45`) | **"اقرأ الموضوع" ×3** (generic) |
| each `/guides/[slug]` | **1**: `/analyze-offer` "حلّل العرض الآن" (`src/components/guides/guide-article.tsx:38`); 2-3 external source links | — |
| each `/insights/[slug]` | **1**: `/insights` "العودة إلى المرصد" (`src/components/insights/insight-article.tsx:35`); 2 external source links | — |
| `/analyze-offer` | none to guides or insights | — |

Gaps:
- No guide→guide, guide→insight, insight→guide or insight→tool links.
- No breadcrumbs.
- The homepage never links to individual guides.
- Every listing uses one generic anchor ("اقرأ الدليل" or "اقرأ الموضوع"), so the target page's topic is not in the anchor text.
- External source links use `target="_blank" rel="noopener noreferrer"` with no `nofollow`. That is fine for citations.

## 7. Structured data

All blocks parse as valid JSON (`json.loads` succeeded on each).

| Page | Type | Contents and gaps |
|---|---|---|
| `/` | `WebSite` (`src/app/page.tsx:13-20`) | name, description, inLanguage. **No `url`** and no `publisher`/Organization. |
| `/insights` | `ItemList` (`src/app/insights/page.tsx:18-27`) | `itemListElement[].url` values are **relative** (`"/insights/verify-hotel-booking-site"`). schema.org/Google expect absolute URLs. |
| `/insights/[slug]` | `Article` (`src/app/insights/[slug]/page.tsx:35-45`) | headline, description, datePublished, dateModified, inLanguage, mainEntityOfPage (absolute), publisher `{@type: Organization, name}`. **No `author`** (an E-E-A-T and Article rich-result recommendation), **no `image`**, and publisher has no `url`/`logo`. Rendered inside the hidden `S:0` block (§5). |
| `/guides/*` | none | No Article/HowTo, even though each has `reviewedAt` and sources. |
| all pages | — | No `BreadcrumbList`. No `Organization` entity anywhere. |

## 8. Images

- **No `<img>` elements** in any page's server HTML, so there are no missing-alt issues. Icons are inline SVGs with `aria-hidden`.
- `next/image` is used only inside interactive tool components (`file-dropzone.tsx`, `hotel-analyzer.tsx`, `travel-offer-review.tsx`, `offer-file-field.tsx`). It renders after user action and is not in the SSR HTML.
- **No `og:image` and no `twitter:image` on any page.** There is no `opengraph-image.*` or `twitter-image.*` file in `src/app` and no `images` field in any metadata. Yet `twitter:card=summary_large_image` is declared site-wide (`layout.tsx:56-57`), so X, WhatsApp, LinkedIn and Slack shares render without an image.
- Available assets: only `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `src/app/apple-icon.png` and `icon.svg`.

## 9. Performance signals (no Lighthouse; no CWV numbers)

- **HTML size** (live, decompressed): `/` 94 KB, `/insights` 177 KB, insight article 42 KB, guide 35 KB, `/terms` 35 KB.
  - About 20 font `<link rel="preload">` tags are in every page head (`grep -c` on index.html gives 20). That is 30 woff2 files totalling 366 KB in `.next/static/media`, from two families (Tajawal, IBM Plex Sans Arabic) at 5 weights each with arabic and latin subsets (`layout.tsx:11-23`).
  - Preloading about 20 fonts competes with the CSS and LCP resources. This is a likely LCP and bandwidth cost on mobile, but unmeasured.
- **JS** (build output, sizes of chunks referenced by the HTML; these hashes differ slightly from live):
  - guide/insight page: 12 chunks, 628 KB raw / 196 KB gzip
  - home: 15 chunks, 673 KB raw / 210 KB gzip
  - `/analyze-offer`: 16 chunks, 826 KB raw / 260 KB gzip
  - These totals include `polyfills-*.js` (113 KB raw / 39 KB gzip). It is `noModule`, so modern browsers skip it. Effective modern totals are about 157 KB gzip for guides and insights.
  - Largest: `1255-*.js` 174 KB raw and `4bd1b696-*.js` 173 KB raw (the React/Next runtime).
- **CSS:** one file, 56 KB raw / 9.5 KB gzip.
- **Compression:** `content-encoding: br` on HTML and the sitemap (live).
- **Caching:**
  - Prerendered pages: `cache-control: public, max-age=0, must-revalidate` with `x-vercel-cache: PRERENDER` or `HIT` (`/` showed `HIT`, `age: 208`), and `x-nextjs-stale-time: 300`. They are served from the edge cache.
  - `/insights` is never cached (§5).
  - `/_next/static` headers were not fetched; the tool would return the whole JS body.
- `poweredByHeader: false`. The CSP and security headers are present on every response.

## 10. Code review summary

Covered in §1-§2. `robots.ts` and `sitemap.ts` are correct apart from `lastmod`. `site-url.ts` falls back to the www origin, which matches production. `seo.ts` gates indexing properly and keeps preview deployments out of the index.

## 11. Verification and analytics tags (live HTML of `/`, `/insights`, a guide and an insight)

- `google-site-verification` meta: **absent**.
- Bing `msvalidate.01`: **absent**. Yandex: absent.
- gtag, GA4, GTM (`googletagmanager`, `gtag(`, `GTM-`): **absent**.
- Vercel Web Analytics: injected client-side by `src/components/web-analytics.tsx:21-40` (`window.va` plus a deferred script). It is not in the SSR HTML.
- GSC may be verified through DNS TXT or an HTML file. **I could not check either** (no DNS tools; Vercel `get_records` returned 403; site file fetches are limited to the MCP tool). Confirm in the GSC UI.

---

## Findings by priority

"Homepage?" means whether the fix touches `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/loading.tsx`, `navbar.tsx`/`footer.tsx` or `globals.css`.

| # | Sev | Finding | Rationale | Homepage? |
|---|---|---|---|---|
| 1 | **P1** | Main content of nearly every page streams into `<div hidden id="S:0">` after the footer; `<main>` server HTML holds only a full-viewport spinner (root `loading.tsx`) | Non-JS crawlers and AI bots may miss or discount content; possible LCP delay (reveal throttled about 300 ms by React's `$RC`); affects all article pages | **Yes**: the clean fix is removing or restructuring root `src/app/loading.tsx` (also changes `/` rendering). Needs an owner decision. |
| 2 | **P1** | No `og:image` or `twitter:image` anywhere while `summary_large_image` is declared | Shares on WhatsApp, X and LinkedIn (the main distribution channels for an Arabic travel channel) render without a preview image, which hurts CTR and links | Per-segment `guides/opengraph-image.tsx`, `insights/[slug]/opengraph-image.tsx` and per-page `openGraph.images`: **No**. A site-wide default in `layout.tsx` or `app/opengraph-image`: **Yes** |
| 3 | **P1** | `og:url`, `og:title` and `og:description` point to the homepage on 13 pages (all except `/insights/[slug]`); `twitter:title`/`twitter:description` are site-wide on all pages | Social scrapers and some aggregators collapse shares to the homepage card; each page shares as "سافر بوعي — SafrBwai" | **No**: add `openGraph`/`twitter` in each page's metadata (a shared helper in `src/lib/seo.ts` that includes siteName and locale). `layout.tsx` stays as is. |
| 4 | **P2** | Guide and insight pages are internal-link dead ends (1 body link each); generic anchors "اقرأ الدليل" and "اقرأ الموضوع"; no related-content or cross links | Weak topical clustering and PageRank flow to the money pages (guides and insights); anchors carry no keywords | **No** (`guide-article.tsx`, `insight-article.tsx`, `guide-list.tsx`, `insight-card.tsx`). `insight-card.tsx` is used only by `insight-list.tsx` on `/insights`. The homepage's three "اقرأ الموضوع" links come from `src/components/home/latest-insights.tsx`, a homepage component that should be left as is. |
| 5 | **P2** | Sitemap `lastmod` equals the build timestamp for all URLs (`2026-10-19T02:10:36.243Z`) | Google learns that lastmod is unreliable and ignores it; real `reviewedAt`/`publishedAt` data exists | **No** (`src/app/sitemap.ts`) |
| 6 | **P2** | Titles of 86-106 characters on guides and insights (bilingual plus brand); guide descriptions of 49-60 characters | SERP truncation; under-used snippet space | **No** (`guides/[slug]`, `insights/[slug]` `generateMetadata` and the guides/insights data) |
| 7 | **P2** | `Article` JSON-LD lacks `author`, `image` and publisher `url`/`logo`; guides have no schema; `ItemList` uses relative URLs; no BreadcrumbList | Missed rich-result and E-E-A-T signals (the author is a named practitioner) | **No** for insights, guides and ItemList. WebSite `url` and Organization on home: **Yes** (`page.tsx`) |
| 8 | **P2** | `/insights` is fully dynamic (`connection()` in the airport-status loader), `no-store`, 177 KB HTML | Slow, uncached TTFB for the hub page that links to all articles; crawl cost | **No** (`airport-status-loader.tsx`, `insights/page.tsx`); could client-load the widget |
| 9 | **P2** | About 20 font files preloaded on every page (2 families × 5 weights × 2 subsets) | Bandwidth and LCP pressure on mobile (unmeasured) | **Yes** (`layout.tsx` font config) |
| 10 | **P3** | hreflang `ar` and `en` both point to `https://www.safrbwai.com` on `/` only; no `x-default`; English is a client-side toggle, not a URL | Invalid or meaningless hreflang; harmless but noisy | **Yes** (`layout.tsx:73-79`) |
| 11 | **P3** | 404 response carries canonical = homepage, root hreflang, and two robots metas (`noindex` and `index, follow`) | Status 404 makes Google ignore it; cosmetic | Fix in `not-found.tsx` metadata or by moving alternates out of the root. Moving them touches `layout.tsx` (**Yes**); `not-found.tsx` alone: **No** |
| 12 | **P3** | No GSC, Bing or GA verification tags in HTML; DNS could not be checked | Cannot confirm Search Console ownership; Bing Webmaster is unverified | Meta-tag method: **Yes** (`layout.tsx` `verification`); DNS TXT method: **No** (preferred) |
| 13 | **P3** | `http://safrbwai.com` takes 2 hops to `https://www`; apex HSTS lacks `includeSubDomains; preload` | Minor latency; blocks HSTS preload submission | **No** (Vercel domain settings) |
| 14 | **P3** | `meta keywords` site-wide | Ignored by Google; exposes internal phrasing | **Yes** (`layout.tsx`) |
| 15 | **P3** | `/admin`, `/auth` and `/dashboard` are disallowed in robots.txt **and** noindex | The disallow hides the noindex; URL-only indexing is possible if linked | **No** (`robots.ts`) |

## Not checked / could not check
- Live HTTP status and headers for 8 sitemap URLs and 3 noindex pages (build output used instead; see Method §3).
- The exact trailing-slash redirect status code (the tool follows same-host redirects).
- Core Web Vitals and Lighthouse (no tooling, site not reachable from the sandbox).
- DNS TXT verification records; GSC and Bing property status.
- `/_next/static` cache-control headers.
