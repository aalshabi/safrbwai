# Homepage Protection Report — Phase 1 (baseline)

**Baseline commit:** `a091568`. It is the production deployment `dpl_62qPXCtAAy3fT264B6RhHzkuxDyd`, READY and aliased to www.safrbwai.com.
**Phase 1 scope:** audit only. The homepage was not modified.

## 1. Homepage route and dependencies

- **Route:** `/`, served by `src/app/page.tsx`. It is wrapped by:
  - `src/app/layout.tsx`
  - `src/app/loading.tsx`
  - `middleware.ts`
- **Transitive source dependencies:** 70 files are listed in `homepage-baseline/deps.txt`. They include:
  - components, lib modules and `globals.css`
  - icons
  - `tailwind`/`postcss`/`next`/`tsconfig` configs
  - `package.json` and the lockfile
- **SHA-256 hashes:** in `homepage-baseline/deps.sha256`.
- **External npm packages:** listed in `homepage-baseline/deps-external-packages.txt`.
- **Shared surfaces:** every file in `deps.txt` is shared with the homepage. The ones most likely to be touched by SEO work are:
  - `layout.tsx` (metadata, fonts, providers, navbar, footer, analytics)
  - `loading.tsx` and `middleware.ts`
  - `components/layout/navbar.tsx` and `components/layout/footer.tsx`
  - `src/lib/seo.ts`, imported by `layout.tsx`
  - `src/lib/travel-insights.ts`, which feeds the homepage insight cards
  - `src/components/insights/insight-card.tsx`, rendered on `/` by `home/latest-insights.tsx`
  - `globals.css`, `tailwind.config.ts` and `next.config.mjs` (headers/CSP)
- **Published insights:** `page.tsx:22` renders **every** published insight. Publishing a new insight changes the homepage even if no listed file changes.
- **Tailwind caveat:** Tailwind scans `src/**/*.{ts,tsx}` (`tailwind.config.ts:9`), so a class-like string added in **any** source file can change the shared CSS bundle. File hashes alone are therefore not enough. The gate also checks the CSS bundle and the screenshots, for every change.

## 2. Recorded baseline

| Artifact | File | Source |
|---|---|---|
| Dependency hashes | `homepage-baseline/deps.sha256` | repo @ a091568 (`sha256sum -c` passes on this branch) |
| Head metadata (lang/dir, title, 24 meta tags, canonical/alternate/icon/manifest links, WebSite JSON-LD, headings) | `metadata.local.json`, `metadata.live.json` | local build, and live via Vercel fetch |
| CSS bundle | `css-bundles.txt` → `/_next/static/css/51093e44739e7ce0.css` | identical in local and live HTML |
| Links and buttons (desktop + mobile + mobile menu) | `interactions.json` (37 links, 4 buttons per profile; summary) and `capture-result.json` (raw output of `tools/capture.cjs`, used for like-for-like comparison) | local build |
| Screenshots (desktop 1440×900, mobile 390×844 @2x, mobile menu open) | `screenshots.sha256` | local build |
| Nondeterminism notes | `notes.md` | — |
| Reproduction scripts | `homepage-baseline/tools/capture.cjs`, `deps.mjs`, `meta.py` | — |

The PNG screenshots are not committed. They are reproducible from commit `a091568` with `homepage-baseline/tools/capture.cjs`. Screenshot hashes depend on the Chromium build and installed fonts, so the gate recaptures the baseline in the same run (§6 step 2). The stored hashes only prove a match in the original environment.

## 3. Determinism

- Each screenshot was taken twice per profile, and a second full run repeated the hashes. Both pairs are byte-identical with 0 differing pixels. The visual baseline is therefore exact, not tolerance-based.
- These HTML parts differ between builds and must be excluded from HTML diffs:
  - the build ID
  - hashed asset names
  - icon query hashes
- No nonces or timestamps appear in the homepage HTML.

## 4. Production vs repository

- **Commit:** Vercel shows the live production deployment was built from `a0915684`, the same commit as this baseline.
- **Metadata:** the live homepage HTML was fetched through the Vercel MCP tool, because the sandbox network policy blocks direct access. After normalising asset hashes, its `<html>` attributes, title, every meta tag, link tags, JSON-LD and H1 are **identical** to the local build.
- **Visual:** the live site was **not** screenshotted, because the sandbox cannot reach it. The visual baseline is the local build of the same commit, and its CSS bundle is the same file as production's.

## 5. Phase 1 gate result

| Check | Result | Evidence |
|---|---|---|
| No homepage source modifications | **Pass** | This branch adds files under `docs/seo/` only; `git diff --stat origin/claude/demo-integrity-fixes...seo/audit-phase1` lists no file outside `docs/seo/` |
| Dependency hashes unchanged | **Pass** | `sha256sum -c docs/seo/homepage-baseline/deps.sha256` → all OK |
| Metadata, content, visual, navigation, responsive | **Not applicable** | No code changed in this phase. The baseline is recorded for Phase 2 |

## 6. Gate procedure for Phase 2 (mandatory before any merge)

All commands run from the repo root. `T=docs/seo/homepage-baseline/tools`.

1. **Dependency hashes.** Run `sha256sum -c docs/seo/homepage-baseline/deps.sha256`. Any changed file must be justified as homepage-neutral, or the change reverted.
2. **Visual.** Build and start **both** the baseline and the candidate in the same environment and the same run:
   - Baseline: `git worktree add /tmp/base a091568`.
   - Candidate: the PR head.
   - For each, run `npm ci && npm run build && npx next start -p <port>`, then `node $T/capture.cjs http://localhost:<port>/ <outDir>`.
   - Desktop and mobile PNG hashes must be equal between baseline and candidate. If they differ, run a pixel diff and block on any non-zero diff.
   - Set `PLAYWRIGHT_BROWSERS_PATH` / `PLAYWRIGHT_MODULE` if Playwright is not resolvable.
3. **Metadata.**
   - Save each homepage with `curl -s http://localhost:<port>/ > home.html`.
   - Run `python3 -I $T/meta.py home.html meta.json` on both.
   - The keys `html`, `title`, `meta`, `links`, `jsonld` and `headings` must be equal after replacing `/_next/static/...` paths and `?<hash>` icon queries.
   - Ignore `source`.
4. **CSS bundle.** The homepage stylesheet name must equal `css-bundles.txt`, or equal the baseline's in the same run. If it changes, step 2 decides whether the change is visible. Any visible change blocks.
5. **Interactions.** The `interactions` object in the candidate's `capture-result.json` must equal the baseline's from the same run: same links, buttons and mobile-menu behaviour.
6. **Published insights.** If the PR publishes or unpublishes an insight, it changes the homepage cards (§1). Block unless the founder approved it.
7. **After merge.** Re-fetch the live homepage (Vercel `web_fetch_vercel_url` if the network blocks curl), run step 3 against `metadata.live.json`, and compare the CSS bundle name.

If any step cannot be run, the gate is reported as **not passed**, never as passed.
