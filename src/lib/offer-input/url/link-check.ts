import { getDomain, getDomainWithoutSuffix } from "tldts";

/**
 * Link check: signals about the link itself, independent of reading the page.
 * They are prompts to verify, never a verdict that a site is safe or a scam:
 * a well-known domain says nothing about the offer, and an unknown one is not
 * proof of fraud.
 */

export type LinkSignalCode =
  | "not_https"
  | "ip_host"
  | "punycode"
  | "shortener"
  | "lookalike"
  | "brand_domain"
  | "redirected_elsewhere"
  | "known_site";

export interface LinkSignal {
  code: LinkSignalCode;
  severity: "info" | "warn";
  /** The domain a lookalike resembles, or the domain a redirect led to. */
  detail?: string;
}

/** Well-known travel sites; a lookalike of one of these is flagged. */
const KNOWN_TRAVEL_DOMAINS = [
  "booking.com", "agoda.com", "expedia.com", "hotels.com", "airbnb.com", "trip.com", "kayak.com", "skyscanner.com",
  "skyscanner.net", "tripadvisor.com", "almosafer.com", "flyin.com", "wego.com", "rehlat.com", "saudia.com",
  "flynas.com", "flyadeal.com", "emirates.com", "qatarairways.com", "etihad.com", "marriott.com", "hilton.com",
  "ihg.com", "accor.com", "hyatt.com", "radissonhotels.com", "rotana.com", "jumeirah.com", "gathern.co",
] as const;
const KNOWN = new Set<string>(KNOWN_TRAVEL_DOMAINS);

// Brands that are also ordinary words: other sites use them legitimately
// (nh-hotels.com, hotel-booking.co, hostels.com), so only the plainest
// imitation, the brand as the first word, is flagged for them.
const GENERIC_BRANDS = new Set(["booking", "hotels", "trip", "kayak", "wego", "flyin", "accor", "hyatt", "ihg"]);

// Words that phishing domains glue to a brand: agodadeals.com, secureairbnb.net.
const BAIT_WORDS = [
  "deal", "deals", "offer", "offers", "sale", "sales", "promo", "discount", "secure", "login", "signin", "verify",
  "account", "support", "help", "confirm", "reservation", "reservations", "booking", "bookings", "pay", "payment",
  "refund", "ksa", "saudi", "sa", "online", "official",
];

// Ordinary words one letter from a brand (gather.town, emirate.com); the
// one-letter rule leaves them alone.
const NEAR_BRAND_WORDS = new Set(["gather", "emirate", "marriage", "booming", "looking", "cooking", "hooking"]);

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "cutt.ly", "is.gd", "rb.gy", "shorturl.at", "ow.ly", "buff.ly",
  "tiny.cc", "s.id", "wa.link", "lnkd.in", "rebrand.ly", "t.ly", "shorturl.gg",
]);

/**
 * example.co.uk from www.deals.example.co.uk, using the public suffix list
 * including private suffixes, so each site on github.io or vercel.app counts
 * as its own domain.
 */
export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}

/** The registrable domain without its public suffix: "booking-deals" for booking-deals.co.th. */
function siteName(domain: string): string {
  return getDomainWithoutSuffix(domain, { allowPrivateDomains: true }) ?? domain.split(".")[0];
}

// Digits and letter pairs commonly swapped in for look-alike letters.
const unconfuse = (s: string) => s.replace(/rn/g, "m").replace(/vv/g, "w").replace(/0/g, "o").replace(/[1l|]/g, "l").replace(/3/g, "e").replace(/5/g, "s");

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = next;
    }
  }
  return row[b.length];
}

/**
 * The known site this host imitates, if any. Deliberately conservative: a
 * wrong warning about a real hotel or airline site is worse than a missed one,
 * since these notes are hints and never a verdict.
 */
function lookalikeOf(host: string): string | null {
  const domain = registrableDomain(host);
  if (KNOWN.has(domain)) return null;
  const name = siteName(domain);
  const words = name.split("-").filter(Boolean);
  const subdomain = host.slice(0, Math.max(0, host.length - domain.length - 1));
  const subdomainLabels = subdomain.split(".").filter(Boolean);
  for (const known of KNOWN_TRAVEL_DOMAINS) {
    const brand = siteName(known);
    const generic = GENERIC_BRANDS.has(brand);
    // booking.com.verify-reservation.info: the whole known domain inside the host.
    if (`.${subdomain}.`.includes(`.${known}.`)) return known;
    // agoda.secure-pay.xyz: a distinctive brand as a subdomain label.
    if (!generic && subdomainLabels.includes(brand)) return known;
    // booking-deals.com, secure-agoda.net (brand as a whole word, with others).
    if (words.length > 1 && (generic ? words[0] === brand : words.includes(brand))) return known;
    if (generic || brand.length < 5) continue;
    // agodadeals.com, secureairbnb.net: a bait word glued on.
    const glued = name.replace(/-/g, "");
    if (glued !== brand && BAIT_WORDS.some((w) => glued === brand + w || glued === w + brand)) return known;
    // ag0da.com, hi1ton.com: look-alike characters.
    if (name !== brand && unconfuse(name) === unconfuse(brand)) return known;
    // bookimg.com, marriot.com: one letter off, only for longer brands where
    // that is rarely an ordinary word.
    if (brand.length >= 7 && !NEAR_BRAND_WORDS.has(name) && Math.abs(name.length - brand.length) <= 1 && editDistance(name, brand) === 1) {
      return known;
    }
  }
  // bo0king.com: look-alike characters for the generic brands too.
  for (const known of KNOWN_TRAVEL_DOMAINS) {
    const brand = siteName(known);
    if (GENERIC_BRANDS.has(brand) && name !== brand && /[0-9]/.test(name) && unconfuse(name) === unconfuse(brand)) return known;
  }
  return null;
}

/** A known brand's exact name on another ending (booking.co, expedia.co.uk): may be official, may not. */
function brandOnOtherDomain(host: string): string | null {
  const domain = registrableDomain(host);
  if (KNOWN.has(domain)) return null;
  const name = siteName(domain);
  return KNOWN_TRAVEL_DOMAINS.find((known) => siteName(known) === name) ?? null;
}

function domainSignals(host: string): LinkSignal[] {
  const domain = registrableDomain(host);
  if (KNOWN.has(domain)) return [{ code: "known_site", severity: "info", detail: domain }];
  const imitated = lookalikeOf(host);
  if (imitated) return [{ code: "lookalike", severity: "warn", detail: imitated }];
  const brand = brandOnOtherDomain(host);
  return brand ? [{ code: "brand_domain", severity: "info", detail: brand }] : [];
}

export function checkLink(rawUrl: string, finalUrl?: string): LinkSignal[] {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return [];
  }
  const signals: LinkSignal[] = [];
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const isIp = /^[\d.]+$/.test(host) || host.startsWith("[");
  if (url.protocol === "http:") signals.push({ code: "not_https", severity: "warn" });
  if (isIp) signals.push({ code: "ip_host", severity: "warn" });
  if (host.split(".").some((label) => label.startsWith("xn--"))) signals.push({ code: "punycode", severity: "warn" });
  const domain = registrableDomain(host);
  const shortener = SHORTENERS.has(domain) || SHORTENERS.has(host);
  if (shortener) signals.push({ code: "shortener", severity: "info" });
  else if (!isIp) signals.push(...domainSignals(host));

  if (finalUrl) {
    let final: URL | null = null;
    try {
      final = new URL(finalUrl);
    } catch {
      // An unparseable final URL adds nothing.
    }
    if (final) {
      const finalHost = final.hostname.toLowerCase().replace(/\.$/, "");
      const finalDomain = registrableDomain(finalHost);
      if (final.protocol === "http:" && url.protocol === "https:") signals.push({ code: "not_https", severity: "warn" });
      if (finalDomain !== domain) {
        // A shortener is expected to lead elsewhere, and a move between two
        // well-known sites (skyscanner.com to skyscanner.net) is not a concern.
        const expected = shortener || (KNOWN.has(domain) && KNOWN.has(finalDomain));
        signals.push({ code: "redirected_elsewhere", severity: expected ? "info" : "warn", detail: finalDomain });
        // The destination is what the user would really be dealing with.
        for (const s of domainSignals(finalHost)) {
          if (!signals.some((x) => x.code === s.code && x.detail === s.detail)) signals.push(s);
        }
      }
    }
  }
  return signals;
}
