/**
 * Server-side request forgery (SSRF) guard for reading an offer link.
 *
 * The server fetches a URL the user typed, so the URL must never reach the
 * server's own network: loopback, private ranges, link-local (cloud metadata
 * at 169.254.169.254), carrier-grade NAT, multicast, reserved and the IPv6
 * equivalents are all refused. The check runs at connection time on the
 * address actually used (see guardedLookup), so a hostname that resolves to a
 * public address for a pre-check and to a private one for the connection
 * (DNS rebinding) is still refused. Every redirect hop is checked again.
 */

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16],
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128], // unspecified
  ["::1", 128], // loopback
  ["64:ff9b::", 96], // NAT64 (maps IPv4, checked below too)
  ["100::", 64], // discard
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4 (embeds IPv4)
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["2001::", 32], // Teredo (embeds IPv4)
  ["64:ff9b:1::", 48], // local-use NAT64
  ["ff00::", 8], // multicast
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** IPv4 embedded in an IPv6 address (::ffff:a.b.c.d, ::a.b.c.d, NAT64). */
function embeddedIPv4(address: string): string | null {
  const dotted = address.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) return dotted[1];
  const hex = address.toLowerCase().match(/^(?:::ffff:|::|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** True for any address the server must not connect to. Unparseable → blocked. */
export function isBlockedAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").split("%")[0];
  const family = isIP(ip);
  if (family === 4) return blocked.check(ip, "ipv4");
  if (family === 6) {
    const v4 = embeddedIPv4(ip);
    if (v4 && isIP(v4) === 4) return true; // any IPv4-in-IPv6 form is refused outright
    return blocked.check(ip, "ipv6");
  }
  return true;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".home.arpa", ".lan"];

export type UrlRefusal = "invalid_url" | "blocked_address";

/**
 * Syntactic checks before any network access: http(s) only, default ports,
 * no credentials, a public-looking hostname, and IP literals that are public.
 * (The WHATWG URL parser already normalizes forms such as http://2130706433
 * and http://0x7f.1 to 127.0.0.1, so they are caught here.)
 */
export function checkTargetUrl(
  raw: string,
  {
    isBlocked = isBlockedAddress,
    allowAnyPort = false,
  }: {
    /** Tests only. */
    isBlocked?: (address: string) => boolean;
    /** Tests only: a local test server listens on a random port. */
    allowAnyPort?: boolean;
  } = {}
): { ok: true; url: URL } | { ok: false; reason: UrlRefusal } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "invalid_url" };
  if (url.username || url.password) return { ok: false, reason: "invalid_url" };
  if (url.port && url.port !== "80" && url.port !== "443" && !allowAnyPort) return { ok: false, reason: "blocked_address" };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return { ok: false, reason: "invalid_url" };
  if (isIP(host.replace(/^\[|\]$/g, ""))) {
    return isBlocked(host) ? { ok: false, reason: "blocked_address" } : { ok: true, url };
  }
  if (host === "localhost" || !host.includes(".") || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "blocked_address" };
  }
  return { ok: true, url };
}

export class BlockedAddressError extends Error {
  constructor() {
    super("blocked address");
    this.name = "BlockedAddressError";
  }
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;
type LookupFn = (hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback) => void;

/**
 * A `lookup` for node:http(s).request that resolves every address of the
 * host and refuses the connection if ANY of them is blocked, so the address
 * Node connects to has always been checked.
 */
export function createGuardedLookup(isBlocked: (address: string) => boolean = isBlockedAddress): LookupFn {
  return (hostname, options, callback) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
      if (err) return callback(err, []);
      if (addresses.length === 0 || addresses.some((a) => isBlocked(a.address))) {
        return callback(new BlockedAddressError() as NodeJS.ErrnoException, []);
      }
      if (options?.all) return callback(null, addresses);
      const preferred = addresses.find((a) => !options?.family || a.family === options.family) ?? addresses[0];
      return callback(null, preferred.address, preferred.family);
    });
  };
}
