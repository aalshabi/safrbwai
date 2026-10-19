// Renders the section share images (1200×630) in public/og with the site's own
// fonts. The images are committed; rerun only when the wording or branding changes.
//
// Playwright is deliberately not a project dependency: package.json and the
// lockfile feed every build, homepage included. Provision it for one run
// without touching either file:
//   npm install --no-save playwright@1.56.1 && npx playwright install chromium
//   npm run build && npx next start -p 3100
//   node scripts/seo/og-images.cjs http://localhost:3100
// Or point PLAYWRIGHT_MODULE at an existing Playwright install.
const { chromium } = loadPlaywright();
const path = require("path");

function loadPlaywright() {
  const name = process.env.PLAYWRIGHT_MODULE || "playwright";
  try {
    return require(name);
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    console.error(`Cannot load ${name}. Run: npm install --no-save playwright@1.56.1 && npx playwright install chromium`);
    process.exit(1);
  }
}

const CARDS = {
  site: { title: "سافر بوعي", line: "قبل لا تدفع… افهم قرار سفرك" },
  tools: { title: "حلّل عرض سفرك قبل الحجز", line: "راجع المعلومات المذكورة في العرض: السعر والمشمولات والإلغاء" },
  guides: { title: "أدلة مراجعة عروض السفر", line: "السعر الشامل · الإلغاء والاسترداد · الترانزيت والأمتعة" },
  insights: { title: "مرصد السفر", line: "مواضيع سفر حديثة موثقة بمصادرها" },
};

const LOGO = `<svg viewBox="0 0 32 32" width="88" height="88"><rect width="32" height="32" rx="8" fill="#13264f"/><circle cx="16" cy="16" r="10" fill="none" stroke="#00A7B6" stroke-width="2"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3" stroke="#00A7B6" stroke-width="2" stroke-linecap="round"/><path d="M16 10l3.2 7.5L16 16l-3.2 1.5L16 10z" fill="#00A7B6"/></svg>`;

function card({ title, line }) {
  return `<div id="og" dir="rtl" lang="ar" style="width:1200px;height:630px;box-sizing:border-box;padding:72px 84px;background:#0D1B3A;color:#fff;display:flex;flex-direction:column;justify-content:space-between;font-family:var(--font-display),sans-serif">
    <div style="display:flex;align-items:center;gap:24px">${LOGO}<span style="font-size:44px;font-weight:800">سافر بوعي</span></div>
    <div>
      <div style="width:96px;height:8px;border-radius:4px;background:#00A7B6;margin-bottom:36px"></div>
      <div style="font-size:76px;font-weight:900;line-height:1.25">${title}</div>
      <div style="font-size:36px;font-weight:500;line-height:1.5;margin-top:24px;color:#b9c7e4">${line}</div>
    </div>
    <div style="font-size:30px;color:#00A7B6;direction:ltr;text-align:right">www.safrbwai.com</div>
  </div>`;
}

(async () => {
  const base = process.argv[2] || "http://localhost:3100";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [name, content] of Object.entries(CARDS)) {
    // Load a site page so the next/font faces and CSS variables are available.
    await page.goto(`${base}/terms`, { waitUntil: "networkidle" });
    await page.evaluate((html) => {
      document.body.innerHTML = html;
      document.body.style.margin = "0";
    }, card(content));
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, "../../public/og", `${name}.png`);
    await page.locator("#og").screenshot({ path: out });
    console.log("wrote", out);
  }
  await browser.close();
})();
