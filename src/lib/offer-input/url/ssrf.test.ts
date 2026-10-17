// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Hostnames used below resolve through this table, never real DNS.
const dnsTable = vi.hoisted(() => new Map<string, { address: string; family: number }[]>());
vi.mock("node:dns", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns")>();
  const lookup = (hostname: string, _options: unknown, callback: (e: Error | null, a: unknown) => void) => {
    const entry = dnsTable.get(hostname);
    if (!entry) return callback(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }), []);
    callback(null, entry);
  };
  return { ...actual, default: { ...actual, lookup }, lookup };
});

import { BlockedAddressError, checkTargetUrl, createGuardedLookup, isBlockedAddress } from "./ssrf";
import { fetchPublicPage } from "./fetch-page";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1", "127.255.255.254", "0.0.0.0", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1",
    "169.254.169.254", "100.64.0.1", "192.0.2.1", "198.18.0.1", "224.0.0.1", "255.255.255.255",
    "::", "::1", "[::1]", "fe80::1", "fe80::1%eth0", "fc00::1", "fd12:3456::1", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:8.8.8.8", "64:ff9b::7f00:1", "2002:7f00:1::1", "fec0::1", "2001:0:4136:e378:8000:63bf:3fff:fdd2", "64:ff9b:1::1", "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "2a00:1450:4001::200e", "2001:4860:4860::8888"])(
    "allows public %s",
    (address) => {
      expect(isBlockedAddress(address)).toBe(false);
    }
  );
});

describe("checkTargetUrl", () => {
  it.each([
    ["http://2130706433/", "blocked_address"], // 127.0.0.1 as a number
    ["http://0x7f.1/", "blocked_address"],
    ["http://127.1/", "blocked_address"],
    ["http://[::1]/", "blocked_address"],
    ["http://169.254.169.254/latest/meta-data/", "blocked_address"],
    ["http://localhost/", "blocked_address"],
    ["http://printer.local/", "blocked_address"],
    ["http://metadata.google.internal/", "blocked_address"],
    ["http://intranet/", "blocked_address"],
    ["https://example.com:8443/", "blocked_address"],
    ["ftp://example.com/", "invalid_url"],
    ["javascript:alert(1)", "invalid_url"],
    ["https://user:pass@example.com/", "invalid_url"],
    ["not a url", "invalid_url"],
  ])("refuses %s", (url, reason) => {
    expect(checkTargetUrl(url)).toEqual({ ok: false, reason });
  });

  it.each(["https://www.booking.com/hotel/x.html?a=1", "http://8.8.8.8/", "https://example.com:443/"])("accepts %s", (url) => {
    expect(checkTargetUrl(url).ok).toBe(true);
  });
});

describe("guarded lookup (connection-time check)", () => {
  it("refuses a host when any of its addresses is private", async () => {
    dnsTable.set("mixed.example", [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);
    const error = await new Promise<unknown>((resolve) => createGuardedLookup()("mixed.example", {}, (err) => resolve(err)));
    expect(error).toBeInstanceOf(BlockedAddressError);
  });

  it("returns the checked address, or all of them when asked", async () => {
    dnsTable.set("public.example", [{ address: "93.184.216.34", family: 4 }]);
    const one = await new Promise((resolve) =>
      createGuardedLookup()("public.example", {}, (err, address, family) => resolve({ err, address, family }))
    );
    expect(one).toEqual({ err: null, address: "93.184.216.34", family: 4 });
    const all = await new Promise((resolve) => createGuardedLookup()("public.example", { all: true }, (_e, a) => resolve(a)));
    expect(all).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  describe("against a local server", () => {
    let server: Server;
    let port: number;
    beforeAll(async () => {
      server = createServer((_req, res) => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<p>عرض خاص بسعر 3200 ريال لمدة 4 ليالٍ</p>");
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      port = (server.address() as AddressInfo).port;
      // A public-looking name that resolves to the server's own loopback
      // address, as in a DNS-rebinding attempt.
      dnsTable.set("rebind.example", [{ address: "127.0.0.1", family: 4 }]);
    });
    afterAll(() => {
      server.closeAllConnections();
      server.close();
    });

    it("refuses a public-looking name that resolves to loopback", async () => {
      expect(await fetchPublicPage(`http://rebind.example:${port}/`, { allowAnyPort: true })).toMatchObject({
        ok: false,
        reason: "blocked_address",
      });
    });

    it("connects through the same lookup when the address is allowed (proves the lookup is used)", async () => {
      const result = await fetchPublicPage(`http://rebind.example:${port}/`, { allowAnyPort: true, isBlocked: () => false });
      expect(result.ok && result.body).toContain("3200 ريال");
    });
  });
});
