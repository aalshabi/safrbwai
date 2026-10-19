// Usage: [PLAYWRIGHT_BROWSERS_PATH=...] [PLAYWRIGHT_MODULE=...] node capture.cjs <url> <outDir>
// Set PLAYWRIGHT_MODULE to the path of an installed playwright package if it is not resolvable from here.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const [url, out] = process.argv.slice(2);
const STYLE = "*{animation:none!important;transition:none!important;caret-color:transparent!important}";
const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

async function settle(page) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: STYLE });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(2000);
}
async function collect(page) {
  return page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!(r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !el.closest("[hidden],[aria-hidden=true]"))) return false;
      for (let p = el.parentElement; p; p = p.parentElement) { const ps = getComputedStyle(p); if (ps.overflow !== "visible" || ps.overflowY !== "visible") { const pr = p.getBoundingClientRect(); if (pr.height < 1 || pr.width < 1 || r.bottom <= pr.top || r.top >= pr.bottom) return false; } }
      return true; };
    const txt = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    const region = (el) => el.closest("header") ? "header" : el.closest("footer") ? "footer" : el.closest("main") ? "main" : "other";
    return {
      links: [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.getAttribute("href"), text: txt(a), ariaLabel: a.getAttribute("aria-label"), target: a.getAttribute("target"), rel: a.getAttribute("rel"), region: region(a), visible: vis(a) })),
      buttons: [...document.querySelectorAll("button,[role=button],input[type=submit],input[type=button]")].map((b) => ({ tag: b.tagName.toLowerCase(), text: txt(b), ariaLabel: b.getAttribute("aria-label"), ariaExpanded: b.getAttribute("aria-expanded"), type: b.getAttribute("type"), region: region(b), visible: vis(b) })),
      headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => ({ tag: h.tagName.toLowerCase(), text: txt(h) || (h.textContent||"").replace(/\s+/g," ").trim(), visible: vis(h) })),
      docHeight: document.documentElement.scrollHeight,
    };
  });
}
async function pixelDiff(browser, a, b) {
  const p = await browser.newPage();
  const r = await p.evaluate(async ([A, B]) => {
    const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(A), load(B)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sameSize: false, a: [ia.width, ia.height], b: [ib.width, ib.height] };
    const c = document.createElement("canvas"); c.width = ia.width; c.height = ia.height; const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, c.width, c.height).data;
    let diff = 0, minY = Infinity, maxY = -1;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i+1] !== db[i+1] || da[i+2] !== db[i+2] || da[i+3] !== db[i+3]) { diff++; const y = Math.floor(i / 4 / c.width); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { sameSize: true, size: [c.width, c.height], diffPixels: diff, diffRatio: diff / (c.width * c.height), diffRowRange: diff ? [minY, maxY] : null };
  }, [a.toString("base64"), b.toString("base64")]);
  await p.close(); return r;
}
(async () => {
  const browser = await chromium.launch();
  const result = { url, browserVersion: browser.version(), captures: {}, interactions: {} };
  for (const [name, prof] of Object.entries(PROFILES)) {
    const shots = [];
    for (let run = 1; run <= 2; run++) {
      const ctx = await browser.newContext({ ...prof, reducedMotion: "reduce", locale: "ar-SA", timezoneId: "Asia/Riyadh", colorScheme: "light" });
      const page = await ctx.newPage();
      const failed = [], console_ = [];
      page.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
      page.on("console", (m) => { if (m.type() === "error") console_.push(m.text()); });
      await settle(page);
      const buf = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
      const f = path.join(out, `home-${name}-run${run}.png`); fs.writeFileSync(f, buf);
      shots.push(buf);
      if (run === 1) {
        const dom = await collect(page);
        result.interactions[name] = { links: dom.links, buttons: dom.buttons };
        result.interactions[name + "_headings"] = dom.headings;
        // Mobile/desktop menu: click a visible header toggle with aria-expanded or a menu-ish label.
        const toggles = page.locator("header button:visible");
        const n = await toggles.count(); const menus = [];
        for (let i = 0; i < n; i++) {
          const t = toggles.nth(i);
          const label = ((await t.getAttribute("aria-label")) || (await t.innerText()) || "").trim();
          const exp = await t.getAttribute("aria-expanded");
          if (exp === null && !/menu|قائمة|القائمة/i.test(label)) continue;
          const before = new Set(dom.links.filter((l) => l.visible).map((l) => l.href + "|" + l.text));
          await t.click(); await page.waitForTimeout(800);
          const after = await collect(page);
          menus.push({ toggle: { label, ariaExpandedBefore: exp, ariaExpandedAfter: await t.getAttribute("aria-expanded").catch(() => null) },
            newlyVisibleLinks: after.links.filter((l) => l.visible && !before.has(l.href + "|" + l.text)), headerLinksVisibleAfterOpen: after.links.filter((l) => l.visible && l.region === "header"),
            visibleButtonsAfter: after.buttons.filter((b) => b.visible) });
          if (name === "mobile") fs.writeFileSync(path.join(out, `home-mobile-menu-open-viewport.png`), await page.screenshot({ fullPage: false }));
          await page.keyboard.press("Escape"); await page.waitForTimeout(300);
          if ((await t.getAttribute("aria-expanded").catch(() => null)) === "true") { await t.click().catch(() => {}); await page.waitForTimeout(300); }
        }
        result.interactions[name + "_menus"] = menus;
        result.captures[name] = { docHeight: dom.docHeight, failedRequests: failed, consoleErrors: console_ };
      }
      await ctx.close();
    }
    result.captures[name].run1_sha256 = sha(shots[0]); result.captures[name].run2_sha256 = sha(shots[1]);
    result.captures[name].byteIdentical = result.captures[name].run1_sha256 === result.captures[name].run2_sha256;
    result.captures[name].pixelDiff = await pixelDiff(browser, shots[0], shots[1]);
  }
  await browser.close();
  fs.writeFileSync(path.join(out, "capture-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ browser: result.browserVersion, captures: result.captures, menus: Object.fromEntries(Object.entries(result.interactions).filter(([k]) => k.endsWith("_menus")).map(([k, v]) => [k, v.map((m) => ({ toggle: m.toggle, newLinks: m.newlyVisibleLinks.map((l) => l.href + " " + l.text) }))])) }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
