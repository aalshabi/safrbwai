# SEO Implementation Plan — Phase 2 (proposed, awaiting approval)

Nothing in this plan has been implemented. Every item lists the files it touches and the tests required.

Every item excludes the protected homepage.

- Every file in `homepage-baseline/deps.txt` is a shared surface.
- Because Tailwind scans all of `src/**/*.{ts,tsx}`, **every** package below must pass the homepage gate (`HOMEPAGE_PROTECTION_REPORT.md` §6) before merge, including content-only changes.

The evidence for each item is in `appendix/TECHNICAL_AUDIT_EVIDENCE.md` (T#) and `appendix/CONTENT_AUDIT.md`.

## Work packages

| WP | Priority | Change | Files | Homepage risk | Tests |
|---|---|---|---|---|---|
| WP1 | P1 | Per-page social metadata. Add a helper `pageMetadata({ title, description, path, type })` in a **new** file `src/lib/page-metadata.ts`. It returns `alternates.canonical`, `openGraph` (url, title, description, siteName, locale `ar_SA`, type) and `twitter` (card `summary_large_image`, title, description). Pass `twitter.card` explicitly, because a page-level `twitter` object replaces the root one. Use the helper in every non-home page. Do not edit `src/lib/seo.ts`: `layout.tsx` imports it | new `src/lib/page-metadata.ts`; `src/app/{analyze-offer,analyze-hotel,analyze-destination,compare-hotels,guides,guides/[slug],insights,insights/[slug],knowledge,privacy,terms}/page.tsx` | None. No file in `deps.txt` changes, and root `openGraph` keeps serving `/` | Unit test of the helper. Build-HTML test asserting `og:url` equals the canonical on each indexable page |
| WP2 | P1 | Share images per section: `opengraph-image.tsx` for `guides/[slug]` and `insights/[slug]`, plus static images for the hubs and tools | New files under those segments | None. No root `opengraph-image` | Build test: `og:image` present and 200 on 6 content pages; `/` still has none |
| WP3 | P1 | SEO titles and descriptions. Optional `seoTitle`/`seoDescription` on guides and insights: Arabic-only titles of 60 characters or less including the « \| سافر بوعي» suffix, and descriptions of 120–155 characters. Use them in `generateMetadata`. The visible H1 and page text are unchanged | `src/lib/guides.ts`, `src/lib/travel-insights.ts`, both `[slug]/page.tsx` | **Shared file:** `travel-insights.ts` feeds the homepage cards. Only *add* fields and never change `title`/`summary`. Full gate required | Length assertions in `guides.test.ts` / `travel-insights.test.ts` |
| WP4 | P2 | Real `lastmod`: use `reviewedAt` (guides) and `reviewedAt`, else `publishedAt` (insights). Static pages keep build time. The `/` entry is unchanged | `src/app/sitemap.ts` | None. The sitemap is not homepage HTML | Extend `robots.test.ts` or add `sitemap.test.ts` |
| WP5 | P2 | Structured data: `Article` for guides; `author` (Person), `publisher` (Organization with logo), `image` and `dateModified` on insights; `BreadcrumbList` on guides and insights; absolute URLs in the `/insights` `ItemList` | `guide-article.tsx`, `insight-article.tsx`, `insights/page.tsx` | None | JSON-LD parse plus required-field tests |
| WP6 | P2 | Internal linking: a «مواضيع ذات صلة» block inside guide and insight pages from an explicit relation map, and descriptive anchors in the `/guides` list. The `/insights` card anchors are **excluded**: `insight-card.tsx` is also rendered on `/` by `home/latest-insights.tsx` (see audit H8) | `guide-article.tsx`, `insight-article.tsx`, `guide-list.tsx`, new `related.ts` (none in `deps.txt`) | Low. Tailwind classes must reuse existing utilities so the shared CSS bundle stays identical | Unit test of the relation map (no self-links, all slugs exist). Homepage gate step 4 |
| WP7 | P2 | Cacheable `/insights`: move the airport-status widget behind a client fetch or a separate dynamic segment so the hub can be prerendered. Keep the existing per-request freshness rule (`airport-status-loader.tsx:9-11`): items are judged against the current time, not the build time | `airport-status-loader.tsx`, `insights/page.tsx` | None. The homepage does not render the widget (confirm in the gate) | Existing airport-status tests; build output shows `/insights` as static (○) |
| WP8 | P3 | Vercel domain settings: make `http://safrbwai.com` redirect in one hop, and add HSTS `includeSubDomains; preload` on the apex | Vercel dashboard (no code) | None | `curl -I` chain after the change |
| WP9 | P3 | Make `robots.ts` stop disallowing `/admin`, `/auth` and `/dashboard` so their `noindex` can be seen | `src/app/robots.ts` | None | `robots.test.ts` |

## Content packages (need editorial approval of every factual claim)

| CP | Priority | Item |
|---|---|---|
| CP1 | P1 | Expand the 3 existing guides (`total-price-and-inclusions`, `cancellation-and-changes`, `transit-and-baggage`) to 900 or more Arabic words each. Requirements: question-style H2s, a visible review date plus a recheck-due date, and the same URLs. Source rule for all content: at least 2 sources per page, at least 1 official; cornerstones need at least 2 official, with a Saudi authority where one exists (Ministry of Tourism, GACA, Ministry of Commerce) |
| CP2 | P1 | New cornerstone C1 «مراجعة عرض السفر قبل الحجز» as the hub for the guides, linking to `/analyze-offer` |
| CP3 | P1 | C5 air-passenger rights in Saudi Arabia (GACA regulation). Figures are quoted only from the official text on the day of publishing (`ops/content-os/06`) |
| CP4 | P1 | Add a Saudi official source to `insights/verify-hotel-booking-site` (its only official source today is the US FTC). Edits `travel-insights.ts`, a shared file, so the full gate is required |
| CP5 | P1 | Author byline and disclosure that the founder runs a travel agency (wording needs founder approval) |

Count-pinning tests `guides.test.ts:7` and `travel-insights.test.ts:7-8` must be updated in the same PR as any new page.

**A new insight changes the homepage.** `page.tsx:22` renders every published insight under the fixed heading «ثلاثة مواضيع تستحق انتباهك الآن». Publishing a 4th insight therefore needs your decision first (audit item H9). New guides do not affect the homepage.

## Excluded (homepage-affecting, founder decision)

See `SEO_AUDIT_AR.md` § «النتائج المستبعدة» (items H1–H7). The highest-value item is H1: root `src/app/loading.tsx` streams page content into a hidden block after the footer on 13 pages. Options:

- **(a)** Keep it as it is. Google renders JavaScript and sees the content.
- **(b)** Add segment-level `loading.tsx` under the content routes, so those routes no longer depend on the root one. This still requires removing or changing the root file, which affects `/`.
- **(c)** Remove the root `loading.tsx` after a homepage visual check.

All three need explicit approval because (b) and (c) touch the homepage render path.

## Monitoring (no code)

1. **Google Search Console:** verify the Domain property `safrbwai.com` by DNS TXT record (Vercel DNS or your registrar). This changes no code and does not touch the homepage. Then submit `https://www.safrbwai.com/sitemap.xml`.
2. **Bing Webmaster Tools:** import from GSC after step 1.
3. **Weekly review** (Sunday, Asia/Riyadh):
   - GSC: indexed pages vs sitemap (13), impressions, clicks, CTR and average position per page, and queries per page.
   - Coverage errors.
   - CWV report once it has data.
   - Vercel Web Analytics: page views and top pages.
   - Record each week in a single tracking sheet. Never extrapolate missing weeks.

## Delivery rules

- Each work package ships as its own PR to the production branch, after: lint, typecheck, full test suite, build, the homepage gate (`HOMEPAGE_PROTECTION_REPORT.md` §6), and an independent review.
- Merge only with founder approval. Verify the production deployment after each merge.
