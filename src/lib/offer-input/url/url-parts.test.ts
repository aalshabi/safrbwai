import { describe, expect, it } from "vitest";
import { htmlToPageText } from "./html-text";
import { checkLink, registrableDomain } from "./link-check";
import { isAllowedByRobots } from "./robots";

describe("robots.txt", () => {
  const robots = `
User-agent: *
Disallow: /search
Allow: /search/public
Disallow: /*.pdf$

User-agent: SafrBwaiBot
User-agent: OtherBot
Disallow: /private
`;
  it.each([
    ["/hotel/dubai", true],
    ["/private/x", false],
    ["/search", true], // our own group replaces the * group
  ])("applies our own group to %s", (path, allowed) => {
    expect(isAllowedByRobots(robots, path)).toBe(allowed);
  });

  it.each([
    ["/search?q=dubai", false],
    ["/search/public/1", true],
    ["/brochure.pdf", false],
    ["/brochure.pdf?x=1", true],
    ["/hotel", true],
  ])("applies the * group to another agent: %s", (path, allowed) => {
    expect(isAllowedByRobots(robots, path, "SomeOtherReader")).toBe(allowed);
  });

  it("treats an empty Disallow and an empty file as allowing everything", () => {
    expect(isAllowedByRobots("User-agent: *\nDisallow:\n", "/x")).toBe(true);
    expect(isAllowedByRobots("", "/x")).toBe(true);
    expect(isAllowedByRobots("User-agent: *\nDisallow: /\n", "/x")).toBe(false);
  });

  it("matches our product token exactly, not as a substring", () => {
    const partial = "User-agent: *\nDisallow: /\n\nUser-agent: Bot\nAllow: /\n\nUser-agent:\nAllow: /\n";
    expect(isAllowedByRobots(partial, "/x")).toBe(false);
    expect(isAllowedByRobots("User-agent: *\nDisallow: /\n\nUser-agent: safrbwaibot/1.0\nAllow: /\n", "/x")).toBe(true);
  });
});

describe("htmlToPageText", () => {
  it("keeps the offer, drops scripts, styles, hidden content and chrome, and decodes entities", () => {
    const html = `<!doctype html><html><head><title>عرض دبي &amp; أبوظبي</title>
      <meta name="description" content="عرض صيفي محدود">
      <style>.x{color:red}</style><script>var price = 1;</script></head>
      <body><nav>الرئيسية | العروض</nav><header>شعار</header>
      <main><h1>باقة دبي</h1><p>4 ليالٍ في فندق <b>Marina View</b> لشخصين</p>
      <ul><li>السعر الإجمالي 3200 ريال</li><li>غير شامل الطيران</li></ul>
      <p hidden>نص مخفي</p><div style="display:none">مخفي أيضًا</div>
      <p>ملاحظة: الأسعار قابلة للتغيير حسب التوفر وقت الحجز، ويُرجى التأكد من الشروط قبل الدفع.</p></main>
      <footer>جميع الحقوق محفوظة</footer><script>track()</script></body></html>`;
    const { title, description, text } = htmlToPageText(html);
    expect(title).toBe("عرض دبي & أبوظبي");
    expect(description).toBe("عرض صيفي محدود");
    expect(text).toContain("4 ليالٍ في فندق Marina View لشخصين");
    expect(text).toContain("السعر الإجمالي 3200 ريال\nغير شامل الطيران");
    expect(text.startsWith("عرض دبي & أبوظبي\n\nعرض صيفي محدود")).toBe(true);
    for (const noise of ["var price", "track()", "color:red", "نص مخفي", "مخفي أيضًا", "الرئيسية", "شعار", "جميع الحقوق"]) {
      expect(text).not.toContain(noise);
    }
  });

  it("falls back to the page without its chrome when there is no substantial main", () => {
    const { text } = htmlToPageText(
      "<body><nav>قائمة</nav><div><p>فندق في جدة لمدة 3 ليالٍ بسعر 2100 ريال</p></div><footer>تذييل</footer></body>"
    );
    expect(text).toBe("فندق في جدة لمدة 3 ليالٍ بسعر 2100 ريال");
  });

  it("survives unclosed tags", () => {
    expect(htmlToPageText("<body><div><p>فندق<p>بسعر 900 ريال<li>شامل الإفطار</body>").text).toBe("فندق\nبسعر 900 ريال\nشامل الإفطار");
  });
});

describe("link check", () => {
  const codes = (url: string, finalUrl?: string) => checkLink(url, finalUrl).map((s) => `${s.code}${s.detail ? `:${s.detail}` : ""}`);

  it("finds the registrable domain from the public suffix list, private suffixes included", () => {
    expect(registrableDomain("www.deals.almosafer.com")).toBe("almosafer.com");
    expect(registrableDomain("hotel.example.com.sa")).toBe("example.com.sa");
    expect(registrableDomain("booking-deals.co.th")).toBe("booking-deals.co.th");
    expect(registrableDomain("booking-deals.github.io")).toBe("booking-deals.github.io");
  });

  it.each([
    ["https://www.booking.com/hotel/ae/x.html", ["known_site:booking.com"]],
    ["http://www.booking.com/hotel", ["not_https", "known_site:booking.com"]],
    ["https://booking-deals-sa.com/offer", ["lookalike:booking.com"]],
    ["https://bo0king.com/offer", ["lookalike:booking.com"]],
    ["https://booking.co/offer", ["brand_domain:booking.com"]],
    ["https://www.expedia.co.uk/x", ["brand_domain:expedia.com"]],
    ["https://almosafer-offers.net/x", ["lookalike:almosafer.com"]],
    ["https://booking.com.verify-reservation.info/", ["lookalike:booking.com"]],
    ["https://agoda.secure-pay.xyz/", ["lookalike:agoda.com"]],
    ["https://booking-deals.co.th/", ["lookalike:booking.com"]],
    ["https://booking-deals.github.io/", ["lookalike:booking.com"]],
    ["https://agodadeals.com/", ["lookalike:agoda.com"]],
    ["https://ag0da.com/", ["lookalike:agoda.com"]],
    ["https://hi1ton.com/", ["lookalike:hilton.com"]],
    ["https://marriot.com/", ["lookalike:marriott.com"]],
    ["https://xn--bookng-9ya.com/", ["punycode"]],
    ["http://45.12.8.9/offer", ["not_https", "ip_host"]],
    ["https://tripsaudi.com/", []],
    ["https://my-travel-agency.com/umrah", []],
  ])("%s", (url, expected) => {
    expect(codes(url)).toEqual(expected);
  });

  it.each([
    "https://www.nh-hotels.com/", "https://www.millenniumhotels.com/", "https://www.omnihotels.com/",
    "https://www.hostels.com/", "https://kayako.com/", "https://hotel-booking.com/", "https://booking.somehotel.com/",
    "https://www.emiratesholidays.com/", "https://www.expediagroup.com/", "https://www.bookingholdings.com/",
    "https://www.hiltongrandvacations.com/", "https://www.saudiaramco.com/", "https://www.visitsaudiarabia.com/",
    "https://milton.com/", "https://cooking.com/", "https://app.gather.town/", "https://www.gather.com/", "https://emirate.com/",
  ])("does not call the legitimate site %s a lookalike", (url) => {
    expect(codes(url)).toEqual([]);
  });

  it("reports a shortener's destination and checks it too", () => {
    expect(codes("https://bit.ly/abc", "https://agoda-deals.com/x")).toEqual([
      "shortener",
      "redirected_elsewhere:agoda-deals.com",
      "lookalike:agoda.com",
    ]);
    expect(checkLink("https://bit.ly/abc", "https://x.com/").find((s) => s.code === "redirected_elsewhere")?.severity).toBe("info");
    expect(codes("https://bit.ly/abc", "https://www.booking.com/h")).toEqual([
      "shortener",
      "redirected_elsewhere:booking.com",
      "known_site:booking.com",
    ]);
  });

  it("warns when a site redirects to another domain or to plain http", () => {
    expect(codes("https://offers.example.com/a", "http://other.net/b")).toEqual(["not_https", "redirected_elsewhere:other.net"]);
    expect(codes("https://example.com/a", "https://www.example.com/b")).toEqual([]);
    expect(codes("https://www.booking.com/", "http://www.booking.com/")).toEqual(["known_site:booking.com", "not_https"]);
  });

  it("treats a move between two well-known sites as information", () => {
    const signals = checkLink("https://www.skyscanner.com/", "https://www.skyscanner.net/");
    expect(signals.find((s) => s.code === "redirected_elsewhere")).toEqual({ code: "redirected_elsewhere", severity: "info", detail: "skyscanner.net" });
  });
});
