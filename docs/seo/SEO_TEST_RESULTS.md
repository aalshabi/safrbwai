# SEO Test Results — Phase 1 (audit only)

Phase 1 changed no application code. The checks below verify the audit evidence and the homepage baseline. They are not tests of new behaviour.

| # | Check | Command / method | Result |
|---|---|---|---|
| 1 | Production deployment matches the audited commit | Vercel `get_deployment dpl_62qPXCtAAy3fT264B6RhHzkuxDyd` | READY; commit `a0915684`; aliases include www.safrbwai.com and safrbwai.com |
| 2 | Live robots.txt | Vercel `web_fetch_vercel_url https://www.safrbwai.com/robots.txt` | 200, valid, references the sitemap |
| 3 | Live homepage metadata vs local build | `tools/meta.py` on live and local HTML, compared after normalising asset hashes | html, title, meta, links, JSON-LD and headings (raw order, 34) all identical |
| 4 | Homepage CSS bundle live vs local | grep `/_next/static/css/*.css` | Same file: `51093e44739e7ce0.css` |
| 5 | Homepage dependency hashes on this branch | `sha256sum -c docs/seo/homepage-baseline/deps.sha256` | All OK |
| 6 | Screenshot determinism | `tools/capture.cjs` run twice per profile against local `next start` of a091568 | desktop and mobile pairs byte-identical (0 differing pixels) |
| 7 | Branch diff scope | `git diff --stat origin/claude/demo-integrity-fixes...seo/audit-phase1` after commit | Only `docs/seo/**` (see final report for the commit SHA) |
| 8 | Keyword map | CSV parse with python `csv` | 30 rows; every title ≤ 60 characters including the « \| سافر بوعي» suffix; every description 120–155 characters (9 lengthened after independent review) |
| 9 | Independent review | Separate reviewer agent, adversarial, read-only | 2 blocking + 7 should-fix findings, all addressed in this package (homepage-coupling of `insight-card.tsx` and new insights, score ceiling, counts, gate procedure, keyword descriptions, appendix consistency) |

## Not run, and why

- **Lighthouse / Core Web Vitals:** no tooling available, and the live site is unreachable from the sandbox network.
- **Live screenshots:** same network restriction. The visual baseline is the local build of the identical commit.
- **Live status checks for 8 sitemap URLs:** taken from the build of the same commit. The 5 pages compared both ways matched exactly.
- **DNS / Search Console / Bing:** no access.
- **Unit tests, lint, typecheck, build of the app:** not run on this branch because it contains no code changes. The last full run on this code (PR #71 head `535abd0`, squash-merged as `a091568`; https://github.com/aalshabi/safrbwai/pull/71) was green in CI and locally: 1336 tests, lint, typecheck and build.
