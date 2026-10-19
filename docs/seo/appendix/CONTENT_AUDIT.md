# safrbwai.com: content audit and keyword map

> **Editor's note (2026-10-19, final package):**
> - Raw specialist output, kept as evidence.
> - The live site was later fetched through the Vercel MCP fetch tool (see `../appendix/TECHNICAL_AUDIT_EVIDENCE.md` and `../SEO_TEST_RESULTS.md`). The live titles, descriptions, H1s and sitemap match the code-derived figures here.
> - The companion files are now `../SEO_KEYWORD_MAP.csv` (9 descriptions lengthened to the 120–155 character rule after independent review) and `TECHNICAL_AUDIT_EVIDENCE.md`.
> - Word counts below count section headings, body and checks; the full rendered article is about 132–240 words.
> - `../SEO_AUDIT_AR.md` and `../SEO_IMPLEMENTATION_PLAN.md` take precedence where they differ. Example: «insight-card.tsx is used only on /insights» is wrong, because it is also rendered on the homepage.


**Date:** 2026-10-19 · **Scope:** read-only audit of the `prod` checkout at commit `a091568` (repo paths below are relative to the repo root) · **Companion file:** `../SEO_KEYWORD_MAP.csv` (30 rows)

> **Method and limits**
> - Evidence for every finding is a `file:line` reference.
> - **The live site could not be reached from this environment.** `curl` was refused by the egress proxy, and WebFetch failed with `getaddrinfo ENOTFOUND www.safrbwai.com` (also `safrbwai.com`). The rendered HTML, the real `<title>`, the sitemap and the index status were therefore inferred from code. They have not been observed live. **Corroboration:** the sibling `TECHNICAL_AUDIT_EVIDENCE.md`, which fetched some pages live, reports the live `/guides/transit-and-baggage` with a title of 89 characters, a description of 60 characters and H1 «راجع الترانزيت والأمتعة قبل الحجز». It reports the live `/insights` with H1 «مواضيع تساعدك على السفر بوعي» and an ItemList whose URLs are relative. All of this matches the code-derived figures below.
> - `site:safrbwai.com` in the available search tool (US-based) returned **zero results**. That says nothing about Google.sa, so check indexing in Google Search Console.
> - No keyword-volume tool was available. **Every demand statement is "غير مُتحقق — فرضية" (an unverified hypothesis).** The SERP observations come from about 14 Arabic WebSearch queries on 2026-10-19, through a US-only engine. They are qualitative and may differ from what a user in Saudi Arabia sees.
> - The editorial rules in `ops/content-os/06_travel_facts.md` and `01_fact_registry.md` were treated as binding. Examples: no ETIAS launch dates; write "مؤهل لـ" for Schengen; do not publish school-holiday dates before they are confirmed on moe.gov.sa.

---

## Part 1: Content inventory

### 1.1 Publication gates (how content reaches the index)

| Gate | Evidence | Effect |
|---|---|---|
| `getReviewedGuides()` filters `status === "reviewed"` | `src/lib/guides.ts:106-108` | Feeds `/guides`, `generateStaticParams`, the sitemap. Guide pages call `notFound()` when not reviewed (`src/app/guides/[slug]/page.tsx:24`) |
| `getPublishedInsights()` filters `status === "published"` and sorts by `priority` | `src/lib/travel-insights.ts:244-248` | Same pattern; insight pages call `notFound()` when not published (`src/app/insights/[slug]/page.tsx:33`) |
| Sitemap includes only gated items | `src/app/sitemap.ts:13-16` | It returns `[]` when `isIndexable()` is false (`sitemap.ts:8`) |
| `isIndexable()` = `publicIndexing` enabled **and** not a Vercel preview | `src/lib/seo.ts:12-14`; `publicIndexing: "enabled"` in `src/lib/product/capabilities.ts:232-246` | Production is indexable. Robots disallows `/api/ /admin /auth /dashboard` (`src/app/robots.ts:18`) |
| `/knowledge` is a preview: `robots: {index:false, follow:true}` | `src/app/knowledge/page.tsx:9`, `src/lib/seo.ts:24`; capability `knowledgeLibrary: "preview"` with the reason "needs editorial review" (`capabilities.ts:127-141`) | Its **28 entries are excluded** from the index. They have no individual URLs and are not in the sitemap |
| **Tests pin the counts** | `src/lib/guides.test.ts:7` expects exactly 3 guides; `src/lib/travel-insights.test.ts:7-8` expects exactly 3 insights with priorities `[1,2,3]`, at least 3 sections and at least 2 sources each | Adding any page means updating these tests. This acts as a de-facto editorial gate. The insight test also needs at least 2 sources per page, which is a useful quality bar to keep |

**Excluded items right now:** 0 guides (all 3 are `reviewed`), 0 insights (all 3 are `published`), and 28 knowledge entries (the whole library is a noindex preview pending editorial review). There are no `draft` items in the data files.

### 1.2 Guides (`/guides/[slug]`, data in `src/lib/guides.ts`)

The page title comes from `${title.ar} — ${title.en}` (`src/app/guides/[slug]/page.tsx:16`) plus the layout template `"%s | سافر بوعي"` (`src/app/layout.tsx:30`). The H1 is `title[locale]` (`src/components/guides/guide-article.tsx:18`). SSR renders Arabic because `defaultLocale = "ar"` (`src/lib/i18n/config.ts:4`) and `<html lang="ar" dir="rtl">` (`layout.tsx:93`).

Word counts below are Arabic body words: headings, body text and checklist items, excluding the title and description. They were computed by bundling the data modules.

| slug (lines) | H1 (= AR title) | AR body words | Sections → H2s | Sources | Dates shown | Internal links out | Status |
|---|---|---|---|---|---|---|---|
| `total-price-and-inclusions` (`guides.ts:21-48`) | راجع السعر النهائي وما يشمله العرض | **70** | 2: «ابدأ بالمستند المكتوب» (3 checks), «لا تعتمد على السعر الإعلاني وحده» (0 checks) | MoT Tourist Rights (EN PDF), MoT FAQs (EN PDF), GACA Passenger Rights (EN PDF) | `reviewedAt 2026-09-27` only, as «آخر مراجعة للمصادر» | Only the CTA `/analyze-offer` (`guide-article.tsx:38`) | reviewed |
| `cancellation-and-changes` (`guides.ts:49-76`) | راجع الإلغاء والتعديل والاسترداد | **72** | 2: «حوّل السياسة إلى إجابات محددة» (4 checks), «احتفظ بما وافقت عليه» (0) | MoT Tourist Rights, GACA | `2026-09-27` | `/analyze-offer` only | reviewed |
| `transit-and-baggage` (`guides.ts:77-103`) | راجع الترانزيت والأمتعة قبل الحجز | **78** | 2: «افحص مسار العبور كاملًا» (3), «اطلب تفاصيل الأمتعة بالأرقام» (0) | IATA Travel Centre, GACA | `2026-09-27` | `/analyze-offer` only | reviewed |

### 1.3 Insights (`/insights/[slug]`, data in `src/lib/travel-insights.ts`)

Insight pages emit Article JSON-LD with `datePublished` and `dateModified` (`src/app/insights/[slug]/page.tsx:35-45`) and OpenGraph article times (`:20-27`). Each section shows a claim-type label (fact, reported, inference, recommendation) via `insight-article.tsx:60-62`. The page shows only `reviewedAt` («آخر تحقق», `insight-article.tsx:45-47`); `publishedAt` is in the schema but not visible.

| slug (lines) | H1 | AR body words | H2s (claim type) | Sources (type, date) | Dates | Internal links out | Status / priority |
|---|---|---|---|---|---|---|---|
| `verify-hotel-booking-site` (`travel-insights.ts:44-109`) | هل حجزت من موقع الفندق الرسمي فعلًا؟ | **168** | ما الذي رُصد؟ (reported) · التحذير الرسمي (fact) · افحص هذه النقاط قبل الدفع (recommendation, 4 checks) | PhocusWire (trade, 2026-10-09); US FTC (official, 2026-06-24) | pub/rev 2026-10-14 | Only «العودة إلى المرصد» `/insights` (`insight-article.tsx:35`) | published / 1 |
| `award-winning-hotel-fit` (`:110-175`) | فندق فائز عالميًا… هل هو الأنسب لرحلتك؟ | **140** | ماذا تعني الجائزة؟ (fact) · ما الذي لا تثبته الجائزة؟ (inference) · حوّل القائمة إلى قرار (recommendation, 4) | Condé Nast Traveler ×2 (editorial, 2026-10-06) | 2026-10-14 | `/insights` only | published / 2 |
| `ai-trip-planning-human-review` (`:176-241`) | الذكاء الاصطناعي خطط رحلتك… من يراجع الأخطاء؟ | **151** | أين وصل الاستخدام؟ (reported) · لماذا تحتاج الخطة إلى إنسان؟ (inference) · طريقة استخدام واعية (recommendation, 4) | Skift (trade, 2026-10-11, partly paywalled); arXiv 2609.26968 (research, 2026-09-22) | 2026-10-14 | `/insights` only | published / 3 |

### 1.4 Knowledge library (`/knowledge`, noindex preview, `src/lib/knowledge.ts:40-330`)

There are 28 entries (`id`, `category`, `title`, a one-line `summary` and `tags`), 4 in each of 7 categories:

- **Hotels:** h1–h4, lines 42-81
- **Destinations:** d1–d4, lines 84-123
- **Tips:** t1–t4, lines 126-167
- **Visa:** v1–v4, lines 168-209
- **Flights:** f1–f4, lines 210-251
- **Weather:** w1–w4, lines 252-293
- **Activities:** a1–a4, lines 294-330

The entries have **no body, no sources, no dates, no review status and no URLs**. They exist only as search-UI cards (`src/components/knowledge-engine.tsx`).

Several summaries make unsourced, generalised claims that the editorial registry would block:

- «أغلب الدول تشترط ٦ أشهر صلاحية» (v4)
- «ست إشارات تفصل الحقيقي عن المزيّف» (h1), with no content behind it
- "best time to book" and "cheapest days" promises (h2, f2), which cannot be verified without data

Treat these as a **topic backlog, not publishable content**.

---

## Part 1b: Audit findings

### A. Thin content (highest-impact issue)
1. **All 3 guides have 70–78 Arabic words of body.** These are checklists, not guides. Each has two H2s, and the second H2 always has zero checks (`guides.ts:40,69,96`). For a query such as «سياسة الإلغاء والاسترداد», competing pages answer the actual sub-questions: deadlines, partial refunds, provider-initiated cancellations and complaints. Target **≥ 900 AR words** for each guide.
2. **Insights have 140–168 words.** That is acceptable for news-pegged items, but `verify-hotel-booking-site` is really an evergreen how-to with a news hook. Fold its checklist into the proposed cornerstone C6/C9 and keep the insight as the dated hook.

### B. Duplication and cannibalization
| Overlap | Evidence | Risk now | Action |
|---|---|---|---|
| The checklist line «ثبّت السعر الإجمالي والعملة والضرائب والرسوم…» appears in 3 places | `guides.ts:32`, `travel-insights.ts:88`, `:155` | Low, because the primary intents differ | Keep the checks short in insights and **link** to `/guides/total-price-and-inclusions` instead of restating them |
| Knowledge h3 «رسوم الفندق المخفية» vs guide `total-price-and-inclusions` | `knowledge.ts:63-71` vs `guides.ts:21` | None today (noindex) | When knowledge goes public, merge it into C2/S1. Do not create a second "hidden fees" URL |
| Knowledge f1 «الترانزيت الوهمي», v3 «تأشيرة الترانزيت», f4 «المقعد والأمتعة» vs guide `transit-and-baggage` | `knowledge.ts:211-251`, `:189-197` | Future risk | Split the cluster deliberately: C4 transit (hub), S9 separate tickets, S10 transit visa, S8 baggage allowance |
| Knowledge f3 «حقوق المسافر عند التأخير والإلغاء» vs guide `cancellation-and-changes` | `knowledge.ts:231-239` | Future risk | C3 covers *pre-purchase* policy questions, C5 covers *post-purchase* GACA rights. Keep that boundary explicit in both H1s |
| Proposed C7 "how to read reviews" vs S15 "fake review signals" | n/a | Design-time | Give each a distinct H1 and intent (broad vs narrow), and link S15 to C7 |
| The guide `transit-and-baggage` combines two intents (transit + baggage) | `guides.ts:78-103` | It dilutes both | Keep the URL as the transit hub (C4) and move baggage depth into S8 |

### C. Weak headings and titles
- **H1s are imperatives ("راجع …")** and do not match how users search. Saudi users tend to phrase queries as questions («وش يشمل…؟», «كم التعويض…؟», «هل أحتاج…؟») or as noun phrases («سياسة الإلغاء والاسترداد»).
- **H2s are generic**: «ابدأ بالمستند المكتوب», «احتفظ بما وافقت عليه». None carries a query term.
- **`<title>` length.** The bilingual pattern `AR — EN | سافر بوعي` gives titles of **86–89 characters for guides and 104–106 for insights** (computed). Google will truncate them, and the English half spends the visible space on a secondary language. The sources are `guides/[slug]/page.tsx:16`, `insights/[slug]/page.tsx:17` and `layout.tsx:30`. Recommendation: use Arabic-only titles of 60 characters or less, and keep English in an `en` variant if one is ever served on its own URL.
- **Meta descriptions** are 49–60 characters for guides (computed). They are underused; aim for about 120–155.
- **Insight H1s** are rhetorical questions with no keyword. For example, «هل حجزت من موقع الفندق الرسمي فعلًا؟» never says «موقع حجز وهمي/موثوق». That is fine for CTR on social, weak for search.
- **The `/insights` index** is titled «مرصد السفر العالمي» (`insights/page.tsx:11`), while its H1 is «مواضيع تساعدك على السفر بوعي» (`insight-list.tsx:13`). Neither states the topic: travel news and consumer alerts.

### D. Citations
- **Good:** every guide and insight has sources, and insights label each claim type. This is a real trust asset, so keep it.
- **Gaps:**
  1. The Arabic-first guides cite **English PDFs** from the Ministry of Tourism and GACA (`guides.ts:15-17`). Check whether official Arabic versions exist and cite those, keeping the English as a secondary link.
  2. In `total-price-and-inclusions`, section 2 says «تشدد المصادر الرسمية…» without naming the source (`guides.ts:39`). Each claim should name its source inline.
  3. The same guide cites **GACA passenger rights** (`guides.ts:46`) for a pricing topic. The relevance is weak; cite MoT plus the MC price-display rules instead (see `ops/content-os/02_platform_and_regulation.md` §5).
  4. `verify-hotel-booking-site` relies on the **US FTC** as its only official source (`travel-insights.ts:102-107`). That is the wrong jurisdiction for Saudi readers. Add a Saudi or GCC official source, such as MoT licence verification or a SAMA fraud-awareness page, or label it explicitly as a US example.
  5. `award-winning-hotel-fit` has **only editorial sources**, both from the same publisher (`:159-174`), yet its section 1 is labelled `fact`. That is acceptable for "what the award is", but it is a weak E-E-A-T profile.
  6. Guides have no inline citations. The sources sit in a footer list (`guide-article.tsx:30-34`), so a reader cannot tell which claim comes from which document.

### E. Dates and time-sensitive claims
- **Guides show only `reviewedAt`.** They have no `datePublished`, no Article JSON-LD and no OpenGraph article times (`guides/[slug]/page.tsx:12-19`). Insights have all three. Add the same schema to guides.
- **The sitemap sets `lastModified: new Date()`** for every URL at build time (`sitemap.ts:20-26`). That sends a false freshness signal. Use `reviewedAt` for guides and insights.
- **The insights `ItemList` JSON-LD uses relative URLs** (`insights/page.tsx:24`). schema.org expects absolute URLs, so prefix them with `SITE_URL`.
- **Time-sensitive claims without an expiry or recheck date:**
  - The "2026 Readers' Choice" item (`travel-insights.ts:129`) dates itself to 2026.
  - The Skift adoption claim (`:195`) is the same.
  - The guide claims about visa and transit rules (`guides.ts:86`) state that rules change but carry no next-review date.
  - Fix: add a `recheckBy` field and show «موعد إعادة الفحص», mirroring the 30/90-day cadence in `ops/content-os/06_travel_facts.md`.
- **The knowledge entries carry no dates at all.** They are not published, but they must not ship as they are.

### F. Missing traveller questions (gaps, validated qualitatively against SERPs)
None of these has a page today:

- **Post-purchase rights:** compensation for delays, cancellations, denied boarding and lost baggage under GACA rules.
- **Complaints:** how and where to complain (GACA, MoT, MC).
- **Agency checks:** verifying a travel agency's licence, and deposit (عربون) refunds.
- **Fees:** resort and local tourism fees; card or DCC fees.
- **Booking decisions:** non-refundable bookings; package vs separate booking.
- **Entry requirements for Saudis:** a how-to-verify method rather than country lists; transit visas; the Schengen multi-entry rule; ETIAS/EES confusion.
- **Reviews:** how to read hotel reviews and spot fake ones. This is a channel script topic in `CLAUDE.md` with no web page.

### G. Search-intent alignment
- **Guides are pre-purchase checklists, but the titles do not state the outcome.** A searcher's intent is usually a question («وش يشمل», «أقدر أسترد؟»). The H1, the first paragraph and the H2s should answer it directly before the checklist.
- **The `/insights` hub mixes evergreen how-tos with news.** Rule of thumb: put evergreen material and anything with an official legal basis under `/guides/…`; put dated, news-pegged or time-sensitive items under `/insights/…` with a recheck date.
- **The site's strongest differentiator is "official source plus claim labels".** Many Arabic SERPs checked rely on secondary blogs with conflicting figures. Examples: baggage compensation (SDR vs SAR amounts), and ETIAS fees of €7 vs €20 on the same third-party site. An official-text-first page is a credible way to compete.

### H. Internal linking and E-E-A-T
- **Guides link out only to `/analyze-offer`**, and insights link only back to `/insights`. No guide links to another guide or to an insight, and vice versa. Add a "related" block driven by data, for example a `related: slug[]` field on each item.
- **The navbar and footer reach `/guides`** through capabilities (`navbar.tsx:31-37`, `footer.tsx:11-14`), and `/insights` is hard-coded. The home page shows the latest insights (`src/app/page.tsx:36`) and the features grid links to `/guides` (`features.test.tsx:40`).
- **No author or reviewer byline**, and the site author is listed as «Abdullah Travel Lab» (`layout.tsx:44-45`).
  - Add a named reviewer only once the owner approves it.
  - The experience claims "10+ years" and "1000+ errors" are flagged as unverified in `01_fact_registry.md` D5, so do not publish them.
  - **Disclose the conflict of interest:** the owner runs a travel agency (`CLAUDE.md`; `02_platform_and_regulation.md` §4-5). This matters most on C8, S3 and S17.
- **Language handling.** The English locale is a client-side toggle on the same URL, and `alternates.languages` maps both `ar` and `en` to `/` (`layout.tsx:75-78`). The hreflang is therefore meaningless. Either drop it or serve `/en/...` for real.

### I. Quick wins (no new content)
1. Arabic-only titles of 60 characters or less, and descriptions of 120–155 characters, for all 6 pages. Change the templates at `guides/[slug]/page.tsx:16` and `insights/[slug]/page.tsx:17`, or add a `seoTitle` field.
2. Article JSON-LD and OpenGraph for guides, plus a visible «تاريخ النشر».
3. Set the sitemap `lastModified` from `reviewedAt`.
4. Use absolute URLs in the insights ItemList.
5. A related-links block on guides and insights.
6. Add one Saudi official source to `verify-hotel-booking-site`.

---

## Part 2: Keyword and content opportunities

**Rules applied**
- **URLs:** routes stay under the existing `/guides/…` (evergreen) and `/insights/…` (time-sensitive). There are no new top-level routes. The three existing guide URLs are **kept and expanded** as cornerstones C2–C4 to preserve their equity.
- **Titles:** each `seo_title` is the full rendered `<title>`, **including the ` | سافر بوعي` suffix** that `layout.tsx:30` adds. All are 60 characters or less, and every meta description is 155 characters or less; both were validated by script.
- **Demand:** all demand is **غير مُتحقق — فرضية**. The CSV `demand_evidence` column records the qualitative SERP observation where a check was run, and says "No SERP check run" where none was.
- **Before publishing:**
  - Every page needs ≥ 2 sources, with at least one official.
  - Show `reviewedAt` and a recheck date.
  - Add a disclosure line where the agency relationship is relevant.
  - Any figure (compensation amounts, fees, dates) is quoted **from the official text on the day of publishing**, as `ops/content-os/06` requires. Secondary-source figures are not used.
- **Tests:** update `guides.test.ts:7` and `travel-insights.test.ts:7-8`, which pin the counts at 3, in the same PR as any new page.

### Priority summary
| Priority | Items | Rationale |
|---|---|---|
| **P1** (next 4–6 weeks) | C1 offer-review hub · C2 total price (expand) · C3 cancellation (expand) · C5 air-passenger rights · C8 tourist rights with agencies · S4 delay compensation · S11 ETIAS/EES (insight) · S13 verify agency licence | Closest to the product (`/analyze-offer`). Official Saudi sources exist (MoT, GACA). SERPs show secondary or contradictory sources (qualitative) |
| **P2** | C4 transit (expand) · C6 hotel booking review · C7 reading hotel reviews · C9 booking scams · C10 entry requirements (method) · S1 · S2 · S3 · S5 · S6 · S9 · S10 · S12 · S14 | Supports the P1 hubs. C7 and S9 tie in to existing channel scripts |
| **P3** | S7 · S8 · S15 · S16 · S17 · S18 · S19 · S20 | Narrower topics, or blocked on research: T2 insurance, J5 school calendar |

### Hub-and-spoke map
- **C1 offer-review hub** → C2 (→ S1, S19), C3 (→ S2, S3), C4 (→ S8, S9, S10), C6 (→ S16, C7 → S15), S17
- **C5 air-passenger rights** → S4, S5, S6, S7, S14, plus the airport-status widget on `/insights`
- **C8 tourist rights with agencies** → S13, S3, S14, C9
- **C10 entry requirements** → S10, S11, S12, S18; S20 links into C3

### Page briefs (10 cornerstones + 20 supporting)

#### C1 · P1 · مراجعة عرض السفر قبل الحجز

- **URL:** `/guides/review-travel-offer-before-booking` · **النوع:** cornerstone · **النية:** informational → tool (commercial investigation)
- **كلمات مرتبطة:** كيف أقارن عروض السفر، أسئلة قبل حجز رحلة، عرض مكتب سفر، تفاصيل العرض السياحي
- **SEO title (54):** كيف تراجع عرض السفر قبل الحجز؟ قائمة عملية | سافر بوعي
- **Meta (132):** قبل ما تدفع لمكتب السفر: راجع السعر الشامل والمشمولات والإلغاء والترانزيت والأمتعة بقائمة مبنية على مصادر رسمية، ثم طبّقها على عرضك.
- **H1:** كيف تراجع عرض السفر قبل ما تدفع؟
- **المخطط:**
  1. ما الذي يجب أن يظهر مكتوبًا في أي عرض (حسب إرشادات حقوق السائح)
  2. السعر الشامل: العملة والضريبة والرسوم في سطر واحد
  3. المشمولات: الفندق ونوع الغرفة والوجبات والنقل والأمتعة
  4. الإلغاء والتعديل والاسترداد لكل جزء من العرض
  5. مسار الطيران والترانزيت ومدة التوقف
  6. هوية البائع وترخيصه وطريقة الدفع
  7. كيف تقارن عرضين بنفس الشروط
  8. أسئلة جاهزة للنسخ + رابط محلل العرض
- **روابط داخلية:** `/analyze-offer` · `/guides/total-price-and-inclusions` · `/guides/cancellation-and-changes` · `/guides/transit-and-baggage` · `/insights/verify-hotel-booking-site`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح + لائحة خدمات السفر والسياحة (mt.gov.sa)؛ الهيئة العامة للطيران المدني: لائحة حماية حقوق العملاء؛ وزارة التجارة: ضوابط الإعلان
- **الطلب:** غير مُتحقق — فرضية. SERP (2026-10-19, US-based search tool): «كيف اقارن عروض مكاتب السفر» returned mostly Skyscanner package landing pages + one Emarat Al Youm news story (2026-09-21) on ignored package terms; no dedicated Saudi how-to seen → possible content gap.
- **KPI:** Indexed ≤14 days; GSC impressions/clicks for the cluster (baseline = 0 at publish); click-through rate page → /analyze-offer

#### C2 · P1 · السعر الشامل لعرض السفر

- **URL:** `/guides/total-price-and-inclusions` · **النوع:** cornerstone (expand existing) · **النية:** informational (pre-purchase)
- **كلمات مرتبطة:** الرسوم المخفية في السفر، وش يشمل عرض السفر، سعر الباقة السياحية، ضريبة القيمة المضافة على الحجز
- **SEO title (56):** السعر الشامل لعرض السفر: وش يشمل وش ما يشمل؟ | سافر بوعي
- **Meta (131):** لا تعتمد على السعر الإعلاني. تعرّف على البنود التي يجب أن يظهرها العرض: الضرائب والرسوم والوجبات والنقل والأمتعة، وما يُدفع لاحقًا.
- **H1:** السعر الشامل لعرض السفر: ما المشمول وما يُدفع لاحقًا؟
- **المخطط:**
  1. لماذا يختلف السعر الإعلاني عن المبلغ النهائي
  2. ما يلزم أن يذكره مستند الحجز (وزارة السياحة)
  3. الضرائب والرسوم: ما يُضاف في الفاتورة وما يُدفع في الوجهة
  4. المشمولات خطوة بخطوة: فندق، غرفة، وجبات، نقل، أمتعة
  5. رسوم تظهر عند الوصول (رسوم المنتجع، ضرائب البلدية/السياحة)
  6. كيف توحّد عرضين قبل المقارنة
  7. قالب سؤال لمكتب السفر
- **روابط داخلية:** `/analyze-offer` · `/guides/review-travel-offer-before-booking` · `/guides/resort-fees-hotel-hidden-charges` · `/insights/verify-hotel-booking-site`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح ولائحة خدمات السفر؛ وزارة التجارة: إعلان الأسعار شاملة الضريبة؛ هيئة الزكاة والضريبة والجمارك (للضريبة)؛ الجهات السياحية الرسمية في الوجهة لرسوم الإقامة
- **الطلب:** غير مُتحقق — فرضية. SERP: «رسوم المنتجع الفندق رسوم مخفية» → one Arabic generic article (e3arabi) then English/US sources (Lonely Planet, NBC) → thin Arabic competition.
- **KPI:** Word count ≥900 AR with ≥4 official sources; GSC impressions for «السعر الشامل/الرسوم المخفية» cluster; scroll-depth/CTA clicks

#### C3 · P1 · سياسة الإلغاء والاسترداد في حجوزات السفر

- **URL:** `/guides/cancellation-and-changes` · **النوع:** cornerstone (expand existing) · **النية:** informational (pre- and post-purchase)
- **كلمات مرتبطة:** استرداد مبلغ الحجز، إلغاء حجز فندق، رسوم تعديل التذكرة، حجز غير قابل للاسترداد
- **SEO title (60):** الإلغاء والاسترداد قبل الحجز: الأسئلة اللي تحميك | سافر بوعي
- **Meta (116):** اعرف آخر موعد للإلغاء بدون غرامة، ومن يرد المبلغ، وما الفرق بين سياسة الطيران والفندق والنقل، قبل ما تؤكد عرض السفر.
- **H1:** الإلغاء والتعديل والاسترداد: ما الذي تسأل عنه قبل التأكيد؟
- **المخطط:**
  1. لماذا تختلف سياسة كل جزء (طيران/فندق/نقل/جولات)
  2. آخر موعد إلغاء مجاني وكيف يُحسب بالتوقيت المحلي
  3. غرامات الإلغاء ومن يصدر الاسترداد ومدته
  4. إذا ألغى مقدم الخدمة: ما الذي تنص عليه الأنظمة
  5. التعديل: فرق السعر مقابل رسوم التعديل
  6. ما تحتفظ به من مستندات مؤرخة
  7. متى تتصعّد الشكوى ولأي جهة
- **روابط داخلية:** `/analyze-offer` · `/guides/non-refundable-booking` · `/guides/travel-agency-deposit-refund` · `/guides/travel-complaint-saudi`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح؛ الهيئة العامة للطيران المدني: لائحة حماية حقوق العملاء (الإلغاء والاسترداد)؛ شروط مقدم الخدمة المكتوبة
- **الطلب:** غير مُتحقق — فرضية. SERP: «سياسة الإلغاء والاسترداد حجز فندق غير قابل للاسترداد» → Airbnb help page + English US pages (Checkbook); no Saudi-context Arabic guide seen.
- **KPI:** GSC impressions for cancellation/refund cluster; internal clicks to S2/S3; time on page

#### C4 · P2 · الترانزيت قبل الحجز

- **URL:** `/guides/transit-and-baggage` · **النوع:** cornerstone (expand existing) · **النية:** informational (pre-purchase)
- **كلمات مرتبطة:** مدة الترانزيت المناسبة، تغيير المطار في الترانزيت، ترانزيت طويل، تذاكر منفصلة
- **SEO title (56):** الترانزيت قبل الحجز: المدة والمطار والتأشيرة | سافر بوعي
- **Meta (120):** قبل ما تحجز رحلة فيها توقف: افحص مدة الترانزيت، وتغيير المطار أو الصالة، والحاجة لتأشيرة عبور، وهل الرحلات على حجز واحد.
- **H1:** الترانزيت قبل الحجز: ما الذي تفحصه في مسار رحلتك؟
- **المخطط:**
  1. اكتب المسار كاملًا: كل مطار وكل توقف
  2. مدة التوقف: قصيرة جدًا أو طويلة جدًا وما أثرها
  3. تغيير المطار أو الصالة والحاجة لدخول الدولة
  4. تأشيرة العبور: كيف تتحقق رسميًا حسب جنسيتك
  5. حجز واحد أو تذاكر منفصلة: من يتحمل الفوات
  6. الأمتعة في الترانزيت: هل تُنقل تلقائيًا
  7. أسئلة لمكتب السفر
- **روابط داخلية:** `/analyze-offer` · `/guides/transit-visa-check` · `/guides/separate-tickets-self-transfer` · `/guides/baggage-allowance-check`
- **مصادر رسمية:** IATA Travel Centre؛ سفارات/قنصليات دول العبور؛ الهيئة العامة للطيران المدني؛ شروط الناقل
- **الطلب:** غير مُتحقق — فرضية. SERP: «الترانزيت هل احتاج تأشيرة عبور للسعوديين» → Wego (rahhal) on Saudi stop-over visa (inbound, not Saudis abroad), generic blogs; the question for Saudi passport holders transiting third countries was not answered → gap.
- **KPI:** GSC impressions for transit cluster; CTR from SERP; clicks to S9/S10

#### C5 · P1 · حقوق المسافر جوًا في السعودية

- **URL:** `/guides/air-passenger-rights-saudi` · **النوع:** cornerstone · **النية:** informational (post-purchase / problem)
- **كلمات مرتبطة:** لائحة حماية حقوق العملاء الطيران المدني، تعويض تأخير الرحلة، إلغاء الرحلة وش حقي، حقوق المسافر عند فقدان الأمتعة
- **SEO title (53):** حقوق المسافر جوًا في السعودية: دليل مبسّط | سافر بوعي
- **Meta (124):** ملخص عملي للائحة حماية حقوق العملاء من الهيئة العامة للطيران المدني: التأخير والإلغاء ورفض الصعود والأمتعة، وكيف تطالب بحقك.
- **H1:** حقوق المسافر جوًا في السعودية: متى تستحق الرعاية أو التعويض؟
- **المخطط:**
  1. على من تنطبق اللائحة (رحلات من/إلى/داخل المملكة)
  2. التأخير: الرعاية حسب مدة التأخير (من نص اللائحة فقط)
  3. الإلغاء: الاسترداد أو إعادة الحجز والتعويض
  4. رفض الصعود والحجز الزائد
  5. الأمتعة المفقودة أو المتأخرة أو التالفة
  6. خطوات المطالبة: الناقل أولًا ثم الهيئة
  7. ما لا تغطيه اللائحة (حالات خارجة عن السيطرة، رحلات خارج المملكة)
  8. ربط مع حالة المطارات في المرصد
- **روابط داخلية:** `/insights` · `/guides/cancellation-and-changes` · `/guides/flight-delay-compensation-saudi` · `/guides/lost-delayed-baggage-claim` · `/guides/travel-complaint-saudi`
- **مصادر رسمية:** الهيئة العامة للطيران المدني: لائحة حماية حقوق العملاء (النسخة العربية الرسمية) وقناة الشكاوى؛ اتفاقية مونتريال 1999 (ICAO) للأمتعة
- **الطلب:** غير مُتحقق — فرضية. SERP: «حقوق المسافر عند تأخير الرحلة الهيئة العامة للطيران المدني» → Qatar Airways EU-rights page, Saudi news (al-madina, ajel, alwatan), tryadel.sa blog, raya.com; secondary sources quote conflicting figures → room for an official-text-first guide.
- **KPI:** GSC impressions/CTR for passenger-rights cluster; ≥1 external citation/backlink; clicks to /insights airport status

#### C6 · P2 · مراجعة حجز الفندق قبل الدفع

- **URL:** `/guides/hotel-booking-review` · **النوع:** cornerstone · **النية:** commercial investigation
- **كلمات مرتبطة:** نوع الغرفة في الحجز، موقع الفندق الرسمي، شروط حجز الفندق، رسوم الفندق عند الوصول
- **SEO title (50):** قبل ما تحجز الفندق: 8 أشياء تتأكد منها | سافر بوعي
- **Meta (124):** اسم الفندق وحده ما يكفي. تأكد من نوع الغرفة والسرير والوجبات والموقع والرسوم عند الوصول وجهة الحجز وسياسة الإلغاء قبل الدفع.
- **H1:** مراجعة حجز الفندق قبل الدفع
- **المخطط:**
  1. هوية الفندق: الاسم والعنوان والفرع الصحيح
  2. فئة الغرفة والسرير والإطلالة كما هي مكتوبة
  3. الوجبات المشمولة وتعريفها
  4. الموقع ووقت التنقل الفعلي
  5. رسوم تُدفع في الفندق
  6. من الجهة التي تأخذ المبلغ (الفندق أم وسيط)
  7. الإلغاء وعدم الحضور
  8. رابط أداة بحث هوية الفندق
- **روابط داخلية:** `/analyze-hotel` · `/insights/verify-hotel-booking-site` · `/insights/award-winning-hotel-fit` · `/guides/hotel-room-type-photos` · `/guides/resort-fees-hotel-hidden-charges`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح؛ الجهات السياحية الرسمية في الوجهة؛ FTC (للإعلانات المضللة) كمرجع مقارن
- **الطلب:** غير مُتحقق — فرضية. No dedicated SERP check for this exact phrase; related query «كيف اعرف ان موقع حجز الفنادق موثوق» returned English sources (BBB, CSMonitor, hospitalitynet) → thin Arabic competition (qualitative).
- **KPI:** GSC impressions; clicks to /analyze-hotel

#### C7 · P2 · كيف تقرأ تقييمات الفنادق

- **URL:** `/guides/read-hotel-reviews` · **النوع:** cornerstone · **النية:** informational
- **كلمات مرتبطة:** تقييمات الفنادق، التقييمات المزيفة، تقييم الفندق في بوكينج وقوقل، تقييمات حديثة
- **SEO title (51):** كيف تقرأ تقييمات الفنادق بدون ما تنخدع؟ | سافر بوعي
- **Meta (123):** الرقم الإجمالي لا يكفي. تعلّم قراءة التقييمات الحديثة والسلبية المعتدلة وردود الإدارة، وكيف تربطها باحتياج رحلتك قبل الحجز.
- **H1:** كيف تقرأ تقييمات الفنادق قبل الحجز؟
- **المخطط:**
  1. لماذا لا يكفي المتوسط العام
  2. التقييمات الحديثة مقابل القديمة
  3. التقييمات السلبية المعتدلة: أين المعلومة
  4. ردود الإدارة وما تكشفه
  5. اختلاف المنصات في التحقق من الإقامة
  6. مطابقة الشكاوى مع نوع رحلتك (عائلة/أزواج/عمل)
  7. إشارات تستحق الحذر (رابط لدليل التقييمات المزيفة)
- **روابط داخلية:** `/analyze-hotel` · `/insights/award-winning-hotel-fit` · `/guides/fake-hotel-reviews-signs` · `/guides/hotel-booking-review`
- **مصادر رسمية:** سياسات المنصات المنشورة عن التحقق من التقييمات؛ FTC Rule on fake reviews (2024) وهيئة المنافسة والأسواق البريطانية CMA كمراجع رسمية؛ وزارة التجارة السعودية (نظام التجارة الإلكترونية)
- **الطلب:** غير مُتحقق — فرضية. SERP: «كيف اعرف التقييمات المزيفة للفنادق» → one Egyptian Arabic article (masrawy 2017) + English (Which?, ITV, ABC) → dated Arabic competition. CLAUDE.md lists «كيف تقرأ تقييمات الفنادق» as an existing video script topic (channel tie-in).
- **KPI:** GSC impressions; clicks to /analyze-hotel; video→page referral

#### C8 · P1 · حقوق السائح مع مكاتب السفر والسياحة

- **URL:** `/guides/tourist-rights-travel-agency` · **النوع:** cornerstone · **النية:** informational (pre- and post-purchase)
- **كلمات مرتبطة:** شكوى على مكتب سفر، ترخيص مكتب سفر وسياحة، وزارة السياحة حقوق السائح، استرجاع مبلغ من مكتب سفر
- **SEO title (58):** حقوقك مع مكتب السفر في السعودية قبل وبعد الدفع | سافر بوعي
- **Meta (131):** ماذا تقول إرشادات وزارة السياحة عن حقوق السائح مع مكاتب السفر: المستند المكتوب، الأسعار، الإلغاء، والتحقق من الترخيص وتقديم الشكوى.
- **H1:** حقوقك مع مكاتب السفر والسياحة في السعودية
- **المخطط:**
  1. من يحق له بيع خدمات السفر (الترخيص)
  2. ما يجب أن يتضمنه مستند الحجز
  3. الأسعار شاملة الضريبة والرسوم
  4. الإلغاء والتعديل والاسترداد
  5. إذا لم تُقدَّم الخدمة المتفق عليها
  6. التحقق من الترخيص قبل التحويل
  7. تقديم الشكوى والقنوات الرسمية (يُثبَّت الرقم/الرابط يوم النشر)
  8. إفصاح: صاحب الموقع يملك وكالة سفر
- **روابط داخلية:** `/analyze-offer` · `/guides/cancellation-and-changes` · `/guides/verify-travel-agency-license` · `/guides/travel-complaint-saudi` · `/guides/travel-agency-deposit-refund`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح، الأسئلة الشائعة، لائحة خدمات السفر والسياحة؛ منصة tourism.sa للخدمات؛ وزارة التجارة: حماية المستهلك
- **الطلب:** غير مُتحقق — فرضية. SERP: «وزارة السياحة حقوق السائح شكوى مكتب سفر وسياحة» → mostly Egyptian/Jordanian news + one Saudi news (alwatan) mentioning 930 and inspection campaigns; no Saudi consumer-facing guide → gap. 930 channel must be verified on mt.gov.sa before publishing.
- **KPI:** GSC impressions; clicks to S13/S14; zero factual corrections after publish

#### C9 · P2 · احتيال حجوزات السفر

- **URL:** `/guides/travel-booking-scams` · **النوع:** cornerstone · **النية:** informational (risk avoidance)
- **كلمات مرتبطة:** عروض سفر وهمية، حساب سفر نصاب، موقع حجز مزيف، تحويل لحساب شخصي
- **SEO title (56):** عروض سفر وهمية: علامات الاحتيال قبل ما تحوّل | سافر بوعي
- **Meta (121):** سعر أقل بكثير من السوق، استعجال، تحويل لحساب فرد، رابط يشبه الرسمي. علامات الاحتيال في حجوزات السفر وكيف تتحقق قبل الدفع.
- **H1:** احتيال حجوزات السفر: كيف تكشفه قبل الدفع؟
- **المخطط:**
  1. أشهر الأنماط: حسابات تواصل، مواقع مقلدة، إعلانات باسم الفندق
  2. الضغط بالوقت و«آخر مقعد»
  3. الدفع لحساب شخصي أو وسيلة لا تُتتبع
  4. التحقق من الترخيص والسجل التجاري
  5. التحقق من الحجز مع الفندق أو الناقل مباشرة
  6. ماذا تفعل إذا دفعت (البنك + البلاغ)
  7. رابط تحليل العرض
- **روابط داخلية:** `/insights/verify-hotel-booking-site` · `/analyze-offer` · `/guides/verify-travel-agency-license` · `/guides/tourist-rights-travel-agency`
- **مصادر رسمية:** وزارة السياحة (التحقق من الترخيص)؛ البنك المركزي السعودي (التوعية بالاحتيال المالي)؛ قنوات البلاغ الرسمية (تُثبت يوم النشر)؛ FTC travel scams
- **الطلب:** غير مُتحقق — فرضية. SERP: «عروض سفر وهمية احتيال حسابات سفر في السعودية» → UAE sources dominate (Dubai Police via Albayan/Emarat Al Youm, 2026-05/06) + Jordanian item; no Saudi official advisory surfaced → gap for Saudi-context guide.
- **KPI:** GSC impressions; shares; clicks to /analyze-offer

#### C10 · P2 · متطلبات السفر والتأشيرة للسعوديين

- **URL:** `/guides/entry-requirements-saudi-travellers` · **النوع:** cornerstone · **النية:** informational (pre-trip)
- **كلمات مرتبطة:** هل احتاج تأشيرة، صلاحية الجواز للسفر، شروط دخول الدول للسعوديين، تأشيرة عند الوصول
- **SEO title (56):** شروط الدخول والتأشيرة للسعوديين: تحقق رسميًا | سافر بوعي
- **Meta (122):** بدل القوائم المنقولة: طريقة التحقق من التأشيرة وصلاحية الجواز وشروط العبور من المصادر الرسمية حسب الوجهة، قبل تأكيد الحجز.
- **H1:** متطلبات الدخول والتأشيرة للمسافر السعودي: كيف تتحقق؟
- **المخطط:**
  1. لماذا لا نعتمد قوائم «دول بدون تأشيرة» المنقولة
  2. المصادر الرسمية: سفارة الوجهة، IATA Travel Centre، الخارجية السعودية
  3. صلاحية الجواز: قاعدة الوجهة لا قاعدة عامة
  4. تأشيرة مسبقة، إلكترونية، عند الوصول: الفرق
  5. العبور والتأشيرة عبر دولة ثالثة
  6. متطلبات إضافية (تأمين، حجز عودة، ملاءة)
  7. سجل تحديث: تاريخ آخر تحقق لكل نقطة
- **روابط داخلية:** `/guides/transit-and-baggage` · `/insights/ai-trip-planning-human-review` · `/guides/transit-visa-check` · `/insights/schengen-multiple-entry-saudis` · `/insights/etias-saudi-travellers`
- **مصادر رسمية:** وزارة الخارجية السعودية؛ سفارات وقنصليات الوجهات؛ IATA Travel Centre؛ بوابة الاتحاد الأوروبي travel-europe.europa.eu؛ gov.uk
- **الطلب:** غير مُتحقق — فرضية. SERP: ETIAS/Schengen queries surface third-party sites (europe-visa.eu) with inconsistent fees and claims → trust gap an official-source-first page can fill. Volume unknown.
- **KPI:** GSC impressions; recheck log kept (30-day cadence per ops/content-os/06_travel_facts.md)

#### S1 · P2 · رسوم المنتجع

- **URL:** `/guides/resort-fees-hotel-hidden-charges` · **النوع:** supporting · **النية:** informational
- **كلمات مرتبطة:** resort fee، رسوم الفندق المخفية، ضريبة السياحة في الفندق، رسوم تُدفع عند الوصول
- **SEO title (56):** رسوم المنتجع ورسوم الفندق عند الوصول: وش هي؟ | سافر بوعي
- **Meta (116):** رسوم المنتجع وضرائب الإقامة المحلية قد لا تظهر في السعر الأول. اعرف أين تبحث عنها في الحجز وكيف تسأل عنها قبل الدفع.
- **H1:** رسوم المنتجع والرسوم التي تُدفع في الفندق
- **المخطط:**
  1. تعريف رسوم المنتجع وما تغطيه عادة
  2. ضرائب ورسوم الإقامة التي تفرضها الوجهة
  3. أين تظهر في صفحة الحجز أو التأكيد
  4. اختلاف الإفصاح بين الدول (مرجع رسمي لكل مثال)
  5. كيف تسأل الفندق قبل الدفع
  6. رابط السعر الشامل
- **روابط داخلية:** `/guides/total-price-and-inclusions` · `/guides/hotel-booking-review` · `/analyze-hotel`
- **مصادر رسمية:** FTC Rule on Unfair or Deceptive Fees (الإقامة القصيرة، الولايات المتحدة)؛ الجهات السياحية الرسمية في الوجهة (مثل دائرة الاقتصاد والسياحة في دبي)؛ وزارة السياحة
- **الطلب:** غير مُتحقق — فرضية. SERP: Arabic query returned one generic Arabic listicle (e3arabi) then English US sources → low Arabic competition (qualitative).
- **KPI:** GSC impressions; internal clicks to C2

#### S2 · P2 · حجز غير قابل للاسترداد

- **URL:** `/guides/non-refundable-booking` · **النوع:** supporting · **النية:** informational
- **كلمات مرتبطة:** non refundable معنى، إلغاء حجز غير مسترد، الفرق بين قابل للاسترداد وغير قابل، دفع الآن أو لاحقًا
- **SEO title (51):** الحجز غير القابل للاسترداد: متى يستاهل؟ | سافر بوعي
- **Meta (117):** السعر الأرخص غالبًا غير قابل للاسترداد. افهم ما تخسره عند الإلغاء أو التعديل، ومتى يكون الفرق في السعر مبررًا لرحلتك.
- **H1:** الحجز غير القابل للاسترداد: ما الذي تخسره بالضبط؟
- **المخطط:**
  1. ما معنى غير قابل للاسترداد (فندق/طيران)
  2. ما يبقى مستردًا أحيانًا (ضرائب ورسوم المطار)
  3. احسب فرق السعر مقابل احتمال التغيير
  4. إذا ألغى مقدم الخدمة: الحكم يختلف
  5. اقرأ السياسة قبل الدفع: أمثلة صياغة
  6. رابط الإلغاء والاسترداد
- **روابط داخلية:** `/guides/cancellation-and-changes` · `/analyze-offer`
- **مصادر رسمية:** الهيئة العامة للطيران المدني (الاسترداد عند إلغاء الناقل)؛ شروط مقدم الخدمة؛ وزارة السياحة
- **الطلب:** غير مُتحقق — فرضية. SERP: Arabic query returned Airbnb help + English pages → no Arabic explainer seen.
- **KPI:** GSC impressions; clicks to C3

#### S3 · P2 · استرجاع العربون من مكتب السفر

- **URL:** `/guides/travel-agency-deposit-refund` · **النوع:** supporting · **النية:** informational (post-purchase)
- **كلمات مرتبطة:** العربون غير مسترد، إلغاء رحلة مع مكتب سفر، دفعة مقدمة حجز سفر، استرداد المبلغ من مكتب سياحي
- **SEO title (60):** العربون والدفعة المقدمة لمكتب السفر: متى تسترده؟ | سافر بوعي
- **Meta (117):** قبل ما تدفع عربون لمكتب السفر: اعرف ما يجب أن يُكتب عن الدفعة المقدمة وشروط استردادها، وماذا تفعل إذا رُفض الاسترداد.
- **H1:** العربون والدفعة المقدمة لمكتب السفر: ما الذي يحميك؟
- **المخطط:**
  1. ما يجب أن يذكره الإيصال/العقد عن الدفعة
  2. الفرق بين ما دُفع للمكتب وما دُفع للموردين
  3. الإلغاء من طرفك مقابل الإلغاء من المكتب
  4. طلب الاسترداد كتابيًا والمهل
  5. التصعيد عبر القنوات الرسمية
- **روابط داخلية:** `/guides/cancellation-and-changes` · `/guides/tourist-rights-travel-agency` · `/guides/travel-complaint-saudi`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح ولائحة خدمات السفر؛ وزارة التجارة: حماية المستهلك
- **الطلب:** غير مُتحقق — فرضية. No SERP check run for this phrase — unverified hypothesis based on the site's agency-offer positioning.
- **KPI:** GSC impressions; clicks to C8

#### S4 · P1 · تعويض تأخير الرحلة

- **URL:** `/guides/flight-delay-compensation-saudi` · **النوع:** supporting · **النية:** informational (post-purchase / urgent)
- **كلمات مرتبطة:** تأخير الرحلة كم ساعة تعويض، وجبة وفندق عند التأخير، تأخير الطيران السعودي حقوق، مطالبة شركة الطيران
- **SEO title (51):** تأخرت رحلتك؟ حقوقك والتعويض حسب اللائحة | سافر بوعي
- **Meta (123):** ماذا تقدّم شركة الطيران عند تأخير رحلتك من أو إلى السعودية حسب لائحة الطيران المدني، ومتى تُعامل الرحلة كملغاة، وكيف تطالب.
- **H1:** تأخير الرحلة: ما حقوقك وكيف تطالب بالتعويض؟
- **المخطط:**
  1. الرعاية حسب مدة التأخير (نص اللائحة حرفيًا مع رقم المادة)
  2. متى يحق لك طلب معاملة الرحلة كملغاة
  3. التعويض المالي: الشروط والاستثناءات
  4. ما تحتفظ به من إثباتات
  5. المطالبة: الناقل أولًا ثم الهيئة
  6. حالة المطارات في المرصد
- **روابط داخلية:** `/guides/air-passenger-rights-saudi` · `/insights` · `/guides/cancellation-and-changes`
- **مصادر رسمية:** الهيئة العامة للطيران المدني: لائحة حماية حقوق العملاء + قناة الشكاوى
- **الطلب:** غير مُتحقق — فرضية. SERP: secondary sources (news, law-firm blogs, AirHelp ar-sa) quote differing figures; Okaz attributes figures to a GACA spokesperson → strong intent signal, official text should anchor. Volume unknown.
- **KPI:** GSC impressions/CTR; clicks to C5; featured-snippet eligibility (qualitative)

#### S5 · P2 · إلغاء الرحلة من شركة الطيران

- **URL:** `/guides/flight-cancellation-rights` · **النوع:** supporting · **النية:** informational (urgent)
- **كلمات مرتبطة:** الرحلة انلغت وش أسوي، استرداد قيمة التذكرة، إعادة الحجز على رحلة أخرى، إشعار الإلغاء
- **SEO title (51):** شركة الطيران ألغت رحلتك؟ خياراتك وحقوقك | سافر بوعي
- **Meta (125):** إذا ألغت شركة الطيران رحلتك: الاسترداد أو إعادة الحجز، والتعويض حسب وقت الإشعار، وما تطلبه كتابيًا، وفق لائحة الطيران المدني.
- **H1:** إلغاء الرحلة من شركة الطيران: ما خياراتك؟
- **المخطط:**
  1. الاسترداد أو إعادة الحجز: من يختار
  2. أثر وقت الإشعار على التعويض
  3. الرحلات ضمن باقة: من المسؤول
  4. الفندق والنقل المرتبطان بالرحلة
  5. المطالبة والإثباتات
- **روابط داخلية:** `/guides/air-passenger-rights-saudi` · `/guides/cancellation-and-changes` · `/insights`
- **مصادر رسمية:** الهيئة العامة للطيران المدني: لائحة حماية حقوق العملاء
- **الطلب:** غير مُتحقق — فرضية. Inferred from same SERP cluster as S4 — unverified.
- **KPI:** GSC impressions; clicks to C5

#### S6 · P2 · تعويض فقدان الأمتعة

- **URL:** `/guides/lost-delayed-baggage-claim` · **النوع:** supporting · **النية:** informational (post-purchase / urgent)
- **كلمات مرتبطة:** تأخر وصول الشنطة، تلف الأمتعة في الطيران، بلاغ فقدان أمتعة، حقوق السحب الخاصة SDR
- **SEO title (56):** شنطتك ضاعت أو تأخرت؟ خطوات المطالبة بالتعويض | سافر بوعي
- **Meta (128):** خطوات المطالبة عند فقدان الأمتعة أو تأخرها أو تلفها: البلاغ في المطار، المهل، الإفصاح عن الأشياء الثمينة، وحدود التعويض الرسمية.
- **H1:** فقدان الأمتعة أو تأخرها: كيف تطالب بالتعويض؟
- **المخطط:**
  1. البلاغ في المطار قبل المغادرة (PIR)
  2. الفرق بين الفقد والتأخير والتلف
  3. حدود التعويض بوحدات حقوق السحب الخاصة ومصدرها
  4. الأشياء الثمينة ونموذج الإفصاح
  5. المهل الزمنية للمطالبة
  6. إذا رفض الناقل: الشكوى للهيئة
- **روابط داخلية:** `/guides/air-passenger-rights-saudi` · `/guides/transit-and-baggage` · `/guides/baggage-allowance-check`
- **مصادر رسمية:** الهيئة العامة للطيران المدني: اللائحة؛ اتفاقية مونتريال 1999 (ICAO)؛ صندوق النقد الدولي لسعر SDR
- **الطلب:** غير مُتحقق — فرضية. SERP: Arabic results show conflicting figures (Okaz citing GACA SDR amounts vs a law-firm blog quoting SAR amounts) → accuracy gap; volume unknown.
- **KPI:** GSC impressions; zero-conflict fact check before publish

#### S7 · P3 · رفض الصعود إلى الطائرة

- **URL:** `/guides/denied-boarding-overbooking` · **النوع:** supporting · **النية:** informational (urgent)
- **كلمات مرتبطة:** الحجز الزائد overbooking، منعوني من الركوب، تعويض رفض الصعود، التنازل عن المقعد طوعًا
- **SEO title (55):** رفض الصعود للطائرة بسبب الحجز الزائد: حقوقك | سافر بوعي
- **Meta (117):** إذا رُفض صعودك بسبب الحجز الزائد: الفرق بين التنازل الطوعي والرفض، وما تنص عليه لائحة الطيران المدني من تعويض ورعاية.
- **H1:** رفض الصعود والحجز الزائد: ما الذي تستحقه؟
- **المخطط:**
  1. متى يُعد رفضًا للصعود ومتى لا (الوثائق، التأخر عن البوابة)
  2. التنازل الطوعي: لا توافق قبل معرفة المقابل
  3. التعويض والرعاية حسب اللائحة
  4. إعادة الحجز
  5. الإثباتات والمطالبة
- **روابط داخلية:** `/guides/air-passenger-rights-saudi` · `/guides/flight-cancellation-rights`
- **مصادر رسمية:** الهيئة العامة للطيران المدني: اللائحة
- **الطلب:** غير مُتحقق — فرضية. No SERP check run — unverified hypothesis.
- **KPI:** GSC impressions

#### S8 · P3 · وزن الأمتعة المسموح في التذكرة

- **URL:** `/guides/baggage-allowance-check` · **النوع:** supporting · **النية:** informational (pre-purchase)
- **كلمات مرتبطة:** الأمتعة مشمولة، حقيبة اليد كم كيلو، عدد القطع والوزن، رسوم الوزن الزائد
- **SEO title (55):** «الأمتعة مشمولة»؟ كيف تتأكد من الوزن والعدد | سافر بوعي
- **Meta (121):** عبارة «الأمتعة مشمولة» لا تكفي. تأكد من عدد القطع والوزن والأبعاد لكل مسافر ولكل رحلة، خصوصًا مع الترانزيت وأكثر من ناقل.
- **H1:** الأمتعة المسموحة في التذكرة: كيف تقرأها بالأرقام؟
- **المخطط:**
  1. القطع مقابل الوزن
  2. حقيبة المقصورة والأغراض الشخصية
  3. الأطفال والرضع
  4. اختلاف الناقل في الرحلات المشتركة
  5. أين تجدها في التذكرة/التأكيد
- **روابط داخلية:** `/guides/transit-and-baggage` · `/analyze-offer` · `/guides/lost-delayed-baggage-claim`
- **مصادر رسمية:** صفحات الأمتعة الرسمية للناقلين؛ IATA؛ الهيئة العامة للطيران المدني
- **الطلب:** غير مُتحقق — فرضية. No SERP check run — unverified; topic overlaps knowledge item f4 (preview).
- **KPI:** GSC impressions

#### S9 · P2 · تذاكر منفصلة في الترانزيت

- **URL:** `/guides/separate-tickets-self-transfer` · **النوع:** supporting · **النية:** informational (pre-purchase)
- **كلمات مرتبطة:** self transfer، حجز رحلتين منفصلتين، فوات الرحلة الثانية، استلام الشنط في الترانزيت
- **SEO title (51):** تذكرتين منفصلتين بترانزيت: وش المخاطرة؟ | سافر بوعي
- **Meta (124):** الرحلة الأرخص أحيانًا تذكرتين منفصلتين. اعرف من يتحمل فوات الرحلة الثانية، ومتى تحتاج تأشيرة لاستلام الأمتعة، وكم وقت تحتاج.
- **H1:** التذاكر المنفصلة في الترانزيت: من يتحمل المخاطرة؟
- **المخطط:**
  1. كيف تعرف أن الرحلتين على حجز واحد
  2. فوات الرحلة الثانية: من يتحمل
  3. استلام الأمتعة وإعادة تسجيلها
  4. الحاجة لدخول الدولة/تأشيرة
  5. وقت الترانزيت الآمن (بدون أرقام عامة غير موثقة)
- **روابط داخلية:** `/guides/transit-and-baggage` · `/guides/transit-visa-check`
- **مصادر رسمية:** الهيئة العامة للطيران المدني؛ شروط النقل لدى الناقلين؛ IATA Travel Centre
- **الطلب:** غير مُتحقق — فرضية. No SERP check run — unverified. CLAUDE.md lists «الترانزيت الوهمي» as a channel script.
- **KPI:** GSC impressions; video→page referral

#### S10 · P2 · تأشيرة الترانزيت للسعوديين

- **URL:** `/guides/transit-visa-check` · **النوع:** supporting · **النية:** informational (pre-trip)
- **كلمات مرتبطة:** تأشيرة عبور، هل احتاج فيزا ترانزيت، ترانزيت بدون تأشيرة، تغيير المطار في الترانزيت
- **SEO title (59):** هل تحتاج تأشيرة ترانزيت؟ طريقة التحقق للسعوديين | سافر بوعي
- **Meta (115):** قاعدة تأشيرة العبور تختلف حسب الدولة والمطار وتغيير الصالة. طريقة التحقق من مصدر رسمي قبل الحجز، بدون قوائم منقولة.
- **H1:** تأشيرة الترانزيت للسعوديين: كيف تتحقق قبل الحجز؟
- **المخطط:**
  1. متى يُشترط تصريح عبور حتى داخل المطار
  2. تغيير المطار أو الصالة يغيّر الحكم
  3. خطوات التحقق في IATA Travel Centre وسفارة الدولة
  4. مسؤولية الناقل عند الصعود
  5. سجل آخر تحقق
- **روابط داخلية:** `/guides/transit-and-baggage` · `/guides/entry-requirements-saudi-travellers` · `/guides/separate-tickets-self-transfer`
- **مصادر رسمية:** IATA Travel Centre؛ سفارات دول العبور؛ وزارة الخارجية السعودية
- **الطلب:** غير مُتحقق — فرضية. SERP: no direct answer for Saudis transiting third countries (results about Saudi's own stop-over visa) → gap.
- **KPI:** GSC impressions

#### S11 · P1 · ETIAS للسعوديين

- **URL:** `/insights/etias-saudi-travellers` · **النوع:** supporting (insight, time-sensitive) · **النية:** informational (myth correction)
- **كلمات مرتبطة:** إيتياس، نظام الدخول والخروج EES، تصريح السفر الأوروبي، مواقع تطلب رسوم ETIAS
- **SEO title (58):** ETIAS وEES: ما الذي يخص المسافر السعودي فعلًا؟ | سافر بوعي
- **Meta (120):** لا تخلط بين ETIAS وEES وتأشيرة شنغن. ما حالة النظامين حسب المصدر الأوروبي الرسمي، ولماذا تحذر من مواقع تطلب رسومًا الآن.
- **H1:** ETIAS وEES وتأشيرة شنغن: ما الذي يخصك كمسافر سعودي؟
- **المخطط:**
  1. الفرق بين EES وETIAS وتأشيرة شنغن
  2. لمن ETIAS بحسب الصفحة الرسمية (المعفيون من التأشيرة)
  3. حالة التشغيل كما في الصفحة الرسمية يوم النشر (بدون تواريخ متوقعة)
  4. مواقع تطلب رسومًا: كيف تميزها
  5. تاريخ آخر تحقق وموعد إعادة الفحص
- **روابط داخلية:** `/insights/schengen-multiple-entry-saudis` · `/guides/entry-requirements-saudi-travellers` · `/insights/verify-hotel-booking-site`
- **مصادر رسمية:** travel-europe.europa.eu (EES/ETIAS) ؛ home-affairs.ec.europa.eu؛ سفارات دول شنغن في الرياض
- **الطلب:** غير مُتحقق — فرضية. SERP: «ETIAS للسعوديين» returns only a third-party site (europe-visa.eu, many language copies) with internally conflicting fees and a launch claim; editorial registry J2 says ETIAS not operating → high-trust correction opportunity. Volume unknown.
- **KPI:** GSC impressions; 30-day recheck logged; no unsupported dates published

#### S12 · P2 · تأشيرة شنغن 5 سنوات للسعوديين

- **URL:** `/insights/schengen-multiple-entry-saudis` · **النوع:** supporting (insight, time-sensitive) · **النية:** informational
- **كلمات مرتبطة:** شنغن متعددة الدخول، نظام الكاسكيد، صلاحية الجواز لشنغن، رسوم تأشيرة شنغن
- **SEO title (55):** شنغن 5 سنوات للسعوديين: مؤهل لها، مو مضمونة | سافر بوعي
- **Meta (124):** ما الذي يعنيه قرار التأشيرة المتعددة للسعوديين، وشرط صلاحية الجواز، ولماذا يبقى القرار تقديريًا للقنصلية. مع تاريخ آخر تحقق.
- **H1:** تأشيرة شنغن متعددة الدخول للسعوديين: ما الشروط؟
- **المخطط:**
  1. القرار الأوروبي وما يقوله نصه
  2. «مؤهل لـ» لا «تحصل على»
  3. شرط صلاحية الجواز
  4. الإقامة 90 يومًا خلال 180
  5. المستندات والتأمين
  6. تاريخ آخر تحقق
- **روابط داخلية:** `/guides/entry-requirements-saudi-travellers` · `/insights/etias-saudi-travellers` · `/guides/travel-insurance-check`
- **مصادر رسمية:** المفوضية الأوروبية (القرار التنفيذي)؛ سفارات/قنصليات دول شنغن في المملكة؛ مركز طلبات التأشيرة الرسمي
- **الطلب:** غير مُتحقق — فرضية. SERP: Saudi/Gulf news (Okaz, Ajel, Asharq Al-Awsat, Sayidaty, Eye of Riyadh 2026-07) dominate → competitive news SERP; differentiate with official text + «مؤهل لـ» framing.
- **KPI:** GSC impressions; 90-day recheck

#### S13 · P1 · التحقق من ترخيص مكتب سفر وسياحة

- **URL:** `/guides/verify-travel-agency-license` · **النوع:** supporting · **النية:** navigational/informational
- **كلمات مرتبطة:** مكتب سفر مرخص، رقم ترخيص وزارة السياحة، مكتب سياحي نظامي، استعلام ترخيص منشأة سياحية
- **SEO title (52):** هل مكتب السفر مرخّص؟ كيف تتحقق قبل الدفع | سافر بوعي
- **Meta (111):** قبل ما تحوّل لمكتب سفر أو حساب على السوشال: كيف تتحقق من الترخيص والاسم التجاري واسم المستفيد في الحساب البنكي.
- **H1:** كيف تتحقق من ترخيص مكتب السفر والسياحة؟
- **المخطط:**
  1. لماذا الترخيص مهم (نص اللائحة)
  2. خطوات الاستعلام عبر قنوات وزارة السياحة (تُثبَّت يوم النشر)
  3. مطابقة الاسم التجاري والسجل وحساب المستفيد
  4. الحسابات الفردية على التواصل
  5. إذا لم تجد الترخيص
- **روابط داخلية:** `/guides/tourist-rights-travel-agency` · `/guides/travel-booking-scams` · `/analyze-offer`
- **مصادر رسمية:** وزارة السياحة (mt.gov.sa / tourism.sa)؛ المركز السعودي للأعمال/وزارة التجارة للسجل التجاري
- **الطلب:** غير مُتحقق — فرضية. SERP: results are intermediary service blogs (rukn-services, projectsegy) + non-Saudi pages; no clear official consumer how-to surfaced → gap.
- **KPI:** GSC impressions; clicks to official verification link

#### S14 · P2 · شكوى على مكتب سفر أو شركة طيران

- **URL:** `/guides/travel-complaint-saudi` · **النوع:** supporting · **النية:** navigational/transactional (post-purchase)
- **كلمات مرتبطة:** تقديم شكوى الطيران المدني، شكوى وزارة السياحة، بلاغ حماية المستهلك، مهلة الرد على الشكوى
- **SEO title (57):** كيف تقدّم شكوى سفر في السعودية؟ الجهة الصحيحة | سافر بوعي
- **Meta (129):** الطيران أم الفندق أم مكتب السفر؟ اعرف الجهة المختصة بشكواك، والمستندات المطلوبة، وترتيب التصعيد من مقدم الخدمة إلى الجهة الرسمية.
- **H1:** شكوى السفر: لأي جهة تقدّمها وكيف؟
- **المخطط:**
  1. خريطة الجهات: الطيران المدني، وزارة السياحة، وزارة التجارة
  2. ابدأ بمقدم الخدمة كتابيًا
  3. المستندات والإثباتات
  4. المهل الزمنية حسب كل لائحة
  5. متابعة الشكوى
- **روابط داخلية:** `/guides/air-passenger-rights-saudi` · `/guides/tourist-rights-travel-agency` · `/guides/cancellation-and-changes`
- **مصادر رسمية:** الهيئة العامة للطيران المدني (قناة الشكاوى)؛ وزارة السياحة؛ وزارة التجارة؛ (تُثبت أرقام/روابط القنوات يوم النشر)
- **الطلب:** غير مُتحقق — فرضية. SERP (C8 query) surfaced only news mentions of complaint channels → gap. Unverified volume.
- **KPI:** GSC impressions

#### S15 · P3 · التقييمات المزيفة للفنادق

- **URL:** `/guides/fake-hotel-reviews-signs` · **النوع:** supporting · **النية:** informational
- **كلمات مرتبطة:** مراجعات وهمية، تقييم 5 نجوم بدون تفاصيل، حسابات جديدة تقيّم، تقييمات مدفوعة
- **SEO title (55):** إشارات التقييمات المزيفة للفنادق وكيف تتحقق | سافر بوعي
- **Meta (124):** مديح عام متكرر، حسابات بلا تاريخ، دفعات تقييمات في أيام قليلة. إشارات تستحق الحذر، مع التنبيه أن الإشارة ليست دليلًا قاطعًا.
- **H1:** التقييمات المزيفة للفنادق: إشارات تستحق الانتباه
- **المخطط:**
  1. لماذا الإشارة ليست حكمًا
  2. أنماط اللغة والتكرار
  3. تاريخ الحساب وتوزيع التواريخ
  4. المقارنة بين المنصات
  5. ما تقوله الأنظمة الرسمية عن التقييمات المزيفة
- **روابط داخلية:** `/guides/read-hotel-reviews` · `/analyze-hotel` · `/insights/award-winning-hotel-fit`
- **مصادر رسمية:** FTC final rule on fake reviews (2024)؛ CMA (UK) DMCC Act guidance؛ وزارة التجارة السعودية
- **الطلب:** غير مُتحقق — فرضية. SERP: dated Arabic (masrawy 2017) + English Which?/ITV → low recency in Arabic. Must not cannibalize C7: C7 = how to read reviews (broad), S15 = fake-review signals (narrow).
- **KPI:** GSC impressions; clicks to C7

#### S16 · P3 · نوع الغرفة في حجز الفندق

- **URL:** `/guides/hotel-room-type-photos` · **النوع:** supporting · **النية:** informational (pre-purchase)
- **كلمات مرتبطة:** غرفة ديلوكس وسوبيريور الفرق، صور الغرف مضللة، إطلالة بحر جزئية، سرير مزدوج أو منفصل
- **SEO title (52):** نوع الغرفة وصورها: لا تحجز على الاسم فقط | سافر بوعي
- **Meta (118):** «ديلوكس» تختلف من فندق لآخر. كيف تتأكد من المساحة والسرير والإطلالة كما هي مكتوبة في الحجز، ولا تعتمد على صور الإعلان.
- **H1:** نوع الغرفة وصورها: ما الذي تتأكد منه قبل الحجز؟
- **المخطط:**
  1. أسماء الفئات ليست معيارًا موحدًا
  2. المساحة والسرير والإطلالة كتابيًا
  3. صور الإعلان مقابل صور الضيوف
  4. الغرف المتصلة للعائلات
  5. اطلب التأكيد باسم الفئة كما في نظام الفندق
- **روابط داخلية:** `/guides/hotel-booking-review` · `/analyze-hotel` · `/insights/award-winning-hotel-fit`
- **مصادر رسمية:** وزارة السياحة (معايير التصنيف داخل المملكة)؛ صفحات الفندق الرسمية
- **الطلب:** غير مُتحقق — فرضية. No SERP check run — unverified; overlaps knowledge item h4 (preview).
- **KPI:** GSC impressions

#### S17 · P3 · باقة سفر أو حجز منفصل

- **URL:** `/guides/package-vs-separate-booking` · **النوع:** supporting · **النية:** commercial investigation
- **كلمات مرتبطة:** الباقة السياحية أوفر؟، حجز الطيران والفندق معًا، مقارنة باقة مكتب سفر، ما تشمله الباقة
- **SEO title (53):** باقة سفر ولا تحجز كل شيء بنفسك؟ كيف تقارن | سافر بوعي
- **Meta (127):** مقارنة عادلة بين باقة مكتب السفر والحجز المنفصل: وحّد التواريخ والغرفة والأمتعة والنقل، ثم قارن المرونة والمسؤولية عند المشاكل.
- **H1:** الباقة السياحية أم الحجز المنفصل: كيف تقارن بعدل؟
- **المخطط:**
  1. وحّد المدخلات قبل المقارنة
  2. ما الذي تضيفه الباقة (نقل، دعم، مسؤولية)
  3. المرونة والإلغاء لكل خيار
  4. من المسؤول إذا تعطّل جزء
  5. مثال مقارنة بأرقام افتراضية مُعلَّمة
- **روابط داخلية:** `/guides/review-travel-offer-before-booking` · `/guides/total-price-and-inclusions` · `/analyze-offer`
- **مصادر رسمية:** وزارة السياحة: حقوق السائح؛ الهيئة العامة للطيران المدني
- **الطلب:** غير مُتحقق — فرضية. SERP (C1 query) showed Skyscanner package pages + Emarat Al Youm; conflict-of-interest risk (owner runs an agency) → needs disclosure.
- **KPI:** GSC impressions; clicks to /analyze-offer

#### S18 · P3 · تأمين السفر وش يغطي

- **URL:** `/guides/travel-insurance-check` · **النوع:** supporting · **النية:** informational/commercial
- **كلمات مرتبطة:** تأمين شنغن، تأمين السفر الطبي، استثناءات تأمين السفر، تأمين إلغاء الرحلة
- **SEO title (55):** تأمين السفر: كيف تقرأ الوثيقة قبل ما تشتري؟ | سافر بوعي
- **Meta (116):** ليست كل وثيقة تأمين سفر متشابهة. ما الذي تراجعه: الحد الأقصى، الاستثناءات، إلغاء الرحلة، ومتطلبات التأشيرة مثل شنغن.
- **H1:** تأمين السفر: ما الذي تراجعه في الوثيقة؟
- **المخطط:**
  1. الغرض: طبي، إلغاء، أمتعة
  2. متطلب التأشيرة (شنغن) من النص الرسمي
  3. الاستثناءات الشائعة في الوثائق
  4. التحقق من ترخيص شركة التأمين
  5. المطالبة والمستندات
- **روابط داخلية:** `/insights/schengen-multiple-entry-saudis` · `/guides/entry-requirements-saudi-travellers`
- **مصادر رسمية:** هيئة التأمين السعودية (ترخيص الشركات)؛ المفوضية الأوروبية: Visa Code لمتطلب التأمين؛ سفارات الوجهة
- **الطلب:** غير مُتحقق — فرضية. No SERP check run; fact registry T2 flags insurance as unchecked → research before writing.
- **KPI:** GSC impressions

#### S19 · P3 · رسوم البطاقة خارج المملكة

- **URL:** `/guides/card-fees-abroad` · **النوع:** supporting · **النية:** informational
- **كلمات مرتبطة:** الدفع بالريال أو بعملة البلد، رسوم التحويل الأجنبي، DCC، سحب نقدي من الخارج
- **SEO title (53):** تدفع بالريال أو بعملة البلد؟ رسوم البطاقة | سافر بوعي
- **Meta (121):** عند الدفع في الخارج قد يُعرض عليك التحويل للريال فورًا. افهم الفرق ورسوم العملة الأجنبية، وراجع الشروط من بنكك قبل السفر.
- **H1:** رسوم البطاقة في السفر: الدفع بالريال أم بعملة البلد؟
- **المخطط:**
  1. ما هو التحويل الديناميكي للعملة
  2. رسوم العملة الأجنبية لدى البنك
  3. السحب النقدي
  4. الحجوزات المدفوعة بعملة أجنبية أونلاين
  5. أين تجد الرسوم في جدول بنكك
- **روابط داخلية:** `/guides/total-price-and-inclusions` · `/guides/resort-fees-hotel-hidden-charges`
- **مصادر رسمية:** البنك المركزي السعودي (حماية عملاء البنوك والإفصاح عن الرسوم)؛ جداول رسوم البنوك
- **الطلب:** غير مُتحقق — فرضية. No SERP check run — unverified hypothesis; fits «hidden fees» pillar.
- **KPI:** GSC impressions

#### S20 · P3 · أفضل وقت للسفر في إجازة المدارس

- **URL:** `/guides/school-holiday-travel-timing` · **النوع:** supporting · **النية:** informational (planning)
- **كلمات مرتبطة:** متى أحجز لإجازة منتصف العام، أسعار السفر في الإجازات، التقويم الدراسي والسفر، موسم الذروة
- **SEO title (60):** السفر في إجازة المدارس: كيف تختار التوقيت والحجز | سافر بوعي
- **Meta (121):** الإجازات القصيرة يرتفع فيها الطلب. كيف تحسب الأيام الفعلية، ومتى تراجع التقويم الرسمي، وما الذي تثبته في العرض قبل الدفع.
- **H1:** السفر في إجازة المدارس: التوقيت والحجز
- **المخطط:**
  1. التقويم من moe.gov.sa فقط (لا تواريخ قبل التثبيت)
  2. احسب الأيام الفعلية مع الطيران
  3. طقس الوجهة من الأرصاد الرسمية لها
  4. الإلغاء المرن في المواسم
  5. أسئلة لمكتب السفر
- **روابط داخلية:** `/guides/cancellation-and-changes` · `/guides/review-travel-offer-before-booking`
- **مصادر رسمية:** وزارة التعليم (التقويم الدراسي)؛ هيئات الأرصاد الرسمية في الوجهات
- **الطلب:** غير مُتحقق — فرضية. No SERP check run. Fact registry J5 bans publishing holiday dates until confirmed on moe.gov.sa → publish principle-only first.
- **KPI:** GSC impressions (seasonal)

---

## Appendix: SERP checks run (2026-10-19, qualitative, US-based engine)

| Query | What ranked (summary) |
|---|---|
| site:safrbwai.com | No results. Indexing status unknown; verify in GSC |
| حقوق المسافر عند تأخير الرحلة الهيئة العامة للطيران المدني تعويض | Qatar Airways EU-rights page, Saudi news (al-madina, ajel, alwatan), tryadel.sa blog, raya.com |
| رسوم المنتجع الفندق رسوم مخفية عند الحجز | One Arabic listicle (e3arabi), then English/US sources |
| كيف اعرف ان موقع حجز الفنادق موثوق | English sources only (BBB, CSMonitor, hospitalitynet, directbooker) |
| سياسة الإلغاء والاسترداد حجز فندق غير قابل للاسترداد | Airbnb Arabic help, Checkbook (US) |
| الترانزيت هل احتاج تأشيرة عبور للسعوديين تغيير المطار | Wego Rahhal (Saudi stop-over visa, inbound), generic blogs, news about Egyptians |
| كيف اعرف التقييمات المزيفة للفنادق | masrawy (2017), Which?, ITV, ABC |
| عرض باقة سفر شامل… كيف اقارن عروض مكاتب السفر | Skyscanner package pages, Emarat Al Youm (2026-09-21) |
| وزارة السياحة حقوق السائح شكوى مكتب سفر وسياحة | Egyptian/Jordanian news, alwatan, okaz |
| تأشيرة شنغن للسعوديين متعددة 5 سنوات الشروط | Ajel, Okaz, Asharq Al-Awsat, Emarat Al Youm, Sayidaty, Eye of Riyadh |
| تعويض فقدان الأمتعة أو تأخرها في المطار السعودية | AirHelp ar-sa, Okaz (GACA spokesperson), law-firm blogs, Al Jazeera travel. **The figures conflict** |
| التحقق من ترخيص مكتب سفر وسياحة في السعودية | Intermediary blogs (rukn-services, projectsegy, sahalfirm), aleqt |
| عروض سفر وهمية احتيال حسابات سفر في السعودية | Dubai Police coverage (Albayan, Emarat Al Youm, Aletihad), a Jordanian item |
| ETIAS للسعوديين هل بدأ التسجيل رسوم | A single third-party site (europe-visa.eu) in many languages, with conflicting fees and a launch claim |

Sources (SERP pages referenced): https://tryadel.sa/blog/حقوق-المسافر-شركات-الطيران-السعودية · https://www.okaz.com.sa/local/na/1741915 · https://www.airhelp.com/ar-sa/flight-compensation-in-saudi-arabia/ · https://e3arabi.com/ · https://www.lonelyplanet.com/articles/information-on-resort-fees · https://ar.airbnb.com/help/article/475 · https://rahhal.wego.com/ · https://www.which.co.uk/news/2019/09/fake-tripadvisor-reviews-push-worlds-best-hotels-up-the-rankings/ · https://www.emaratalyoum.com/business/local/2026-09-21-1.2084923 · https://www.alwatan.com.sa/a/1180378 · https://aawsat.com/node/4981246 · https://projectsegy.com/travel-and-tourism-agencies-saudi/ · https://www.albayan.ae/news/uae/1456588 · https://europe-visa.eu/blog/etias-for-saudi-arabian-citizens-2026/
