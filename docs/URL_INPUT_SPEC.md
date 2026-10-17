# Link (URL) offer input — specification

## Status

- Product Owner decision (2026-10-17): support links by reading the public page **and** checking the link.
- Capability `urlInput`: `enabled`.

## Design

A browser cannot read another site's page (CORS), so the server reads it, then the text follows the same path as PDF and image text: review in the text field, analysis of the confirmed text only.

```text
User enters a link, presses «اقرأ الصفحة»
  -> POST /api/offer/read-url {url}            (JSON ≤ 4 KB, URL ≤ 2,048 chars, 6 reads/min per caller)
  -> URL checks: http(s), ports 80/443, no credentials, public hostname or public IP literal
  -> robots.txt of the site (SafrBwaiBot, then *), RFC 9309 matching
  -> GET with the SSRF guard on every connection and every redirect (≤ 4)
  -> HTML / plain text only, ≤ 2 MB after decompression, 8 s in total
  -> charset from header or <meta> (e.g. windows-1256), HTML -> text (htmlparser2, no scripts run)
  -> link check (independent of the read)
  -> {ok, text, finalUrl, signals} | {ok:false, reason, signals}
  -> text moves to the text field with a review notice and the link notes
```

Code: `src/lib/offer-input/url/` (`ssrf.ts`, `fetch-page.ts`, `robots.ts`, `html-text.ts`, `link-check.ts`, `read-url.ts`, `rate-limit.ts`), `src/app/api/offer/read-url/route.ts`, `src/lib/offer-input/read-url-offer-text.ts`, `src/components/offer-input/url-offer-input.tsx`, `link-signals.tsx`.

## SSRF protection

- Refused before any network access: non-http(s) schemes, credentials in the URL, ports other than 80/443, `localhost`, single-label hosts, `.local`, `.internal`, `.intranet`, `.home.arpa`, `.lan`, and IP literals in blocked ranges. The URL parser normalizes `http://2130706433` and `http://0x7f.1` to `127.0.0.1`, which is then refused.
- Blocked ranges: 0/8, 10/8, 100.64/10, 127/8, 169.254/16 (cloud metadata), 172.16/12, 192.0.0/24, 192.0.2/24, 192.88.99/24, 192.168/16, 198.18/15, 198.51.100/24, 203.0.113/24, 224/4, 240/4; IPv6 ::, ::1, 64:ff9b::/96, 64:ff9b:1::/48, 100::/64, 2001::/32 (Teredo), 2001:db8::/32, 2002::/16, fc00::/7, fe80::/10, fec0::/10, ff00::/8, and any IPv4-in-IPv6 form.
- **Connection-time check:** the request's own `lookup` resolves the host and refuses it if any address is blocked, so the address Node connects to is always the checked one (no DNS-rebinding gap). Redirect targets go through the same URL checks and lookup.
- A fresh connection per request (`agent: false`); no cookies are sent or kept.

## Privacy

- Sent to our server: the link. The site sees our server's address, not the user's.
- Not stored or logged: the link, the page, its text. Server errors log only the request id, a code, status and duration.
- The reader identifies itself: `Mozilla/5.0 (compatible; SafrBwaiBot/1.0; +https://www.safrbwai.com/privacy)`, and honours robots.txt. A robots.txt that answers with a server error (5xx) or is over 512 KiB is treated as "disallowed"; one that cannot be reached stops the read too, reported as `unreachable`; a missing one (4xx) or one behind too many or invalid redirects as "allowed" (RFC 9309). Groups match our product token exactly, case-insensitively. Responses we do not read (redirect hops, non-page content) are closed at once, and every connection is closed when the read ends, so nothing downloads in the background.
- The UI asks users not to enter links containing booking numbers or personal data.

## Link check

Notes, never a verdict: «للتحقق، وليست حكمًا على الموقع».

| Signal | When |
| --- | --- |
| `not_https` | `http:` link, or an https link redirecting to http |
| `ip_host` | Numeric host |
| `punycode` | An `xn--` label (possible homograph) |
| `shortener` | bit.ly, t.co, tinyurl.com, wa.link, … |
| `lookalike` | The host imitates a known travel site: the brand as a word with others (`booking-deals.com`, `secure-airbnb.net`), glued to a bait word (`agodadeals.com`), look-alike characters (`ag0da.com`, `bo0king.com`), one letter off for brands of 7+ letters (`marriot.com`), or the known domain or a distinctive brand in a subdomain (`booking.com.verify-reservation.info`). Brands that are ordinary words (booking, hotels, trip, kayak, …) are flagged only as the first word or with look-alike digits, so `nh-hotels.com` and `hotel-booking.com` are not. Deliberately conservative: a wrong warning about a real hotel or airline is worse than a missed one. |
| `brand_domain` | The exact brand name on another ending (`expedia.co.uk`, `booking.co`): info only, since it may be an official country site |
| `redirected_elsewhere` | The final page is on another registrable domain (info for shorteners and for moves between two known sites, a warning otherwise); the destination gets its own `known_site` / `lookalike` / `brand_domain` note |
| `known_site` | A known travel domain — with the reminder that this says nothing about the offer |

Registrable domains come from the public suffix list, private suffixes included (`tldts`), so `x.github.io` and `booking-deals.co.th` are their own sites. An https link that ends on an http page gets `not_https`.

## Refusals

`invalid_url`, `blocked_address`, `robots_disallowed`, `not_found`, `http_error`, `not_html`, `too_large`, `timeout`, `unreachable`, `too_many_redirects`, `no_text` (pages built by JavaScript or behind a login), `too_long` (never truncated), `rate_limited`, `failed`. Each has an Arabic and English message suggesting the text or screenshot route.

## Limits

- Many booking sites render with JavaScript or block automated readers; those end in `no_text`, `http_error` or `robots_disallowed`, and the user is pointed to a screenshot or pasted text.
- The rate limit is per server instance (in-memory), like the analysis endpoint.
