import type { Locale } from "@/lib/i18n/config";

type Localized = Readonly<Record<Locale, string>>;

export type TravelGuide = Readonly<{
  slug: string;
  title: Localized;
  description: Localized;
  reviewedAt: string;
  status: "reviewed" | "draft";
  sections: readonly Readonly<{ heading: Localized; body: Localized; checks: readonly Localized[] }>[];
  sources: readonly Readonly<{ label: Localized; href: string }>[];
}>;

const MINISTRY_RIGHTS = "https://cdn.mt.gov.sa/files/A360/TouristsRights-EN.pdf";
const MINISTRY_FAQ = "https://cdn.mt.gov.sa/files/A360/doc/FAQs-EN.pdf";
const GACA_RIGHTS = "https://gaca.gov.sa/-/media/Files/PDF/LawsAndRegulation/Consumer-Protection/Passenger-Rights-Protection-Regulations-EN.pdf";
const IATA_TRAVEL_CENTRE = "https://www.iata.org/en/travel-centre/";

export const TRAVEL_GUIDES: readonly TravelGuide[] = [
  {
    slug: "total-price-and-inclusions",
    title: { ar: "راجع السعر النهائي وما يشمله العرض", en: "Review the total price and inclusions" },
    description: { ar: "قائمة قصيرة تكشف البنود التي يجب تثبيتها كتابيًا قبل الدفع.", en: "A short checklist of terms to confirm in writing before paying." },
    reviewedAt: "2026-09-27",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "ابدأ بالمستند المكتوب", en: "Start with the written document" },
        body: { ar: "توضح إرشادات وزارة السياحة أن مستند الحجز ينبغي أن يبيّن مدة الخدمة والأسعار والخدمات المجانية والمدفوعة وسياسات الحجز والإلغاء والتعديل.", en: "Saudi Ministry of Tourism guidance says the booking document should show service duration, prices, free and paid services, and booking, cancellation, and amendment policies." },
        checks: [
          { ar: "اطلب السعر الإجمالي والعملة والضرائب والرسوم في سطر واضح.", en: "Ask for the total, currency, taxes, and fees in one clear line." },
          { ar: "ثبّت أسماء الفنادق ونوع الغرفة والوجبات والنقل والأمتعة.", en: "Confirm hotel names, room type, meals, transfers, and baggage." },
          { ar: "افصل ما هو مشمول عما يُدفع لاحقًا.", en: "Separate included items from charges due later." },
        ],
      },
      {
        heading: { ar: "لا تعتمد على السعر الإعلاني وحده", en: "Do not rely on the advertised price alone" },
        body: { ar: "تشدد المصادر الرسمية على إظهار الرسوم والضرائب والإضافات بوضوح. قارن فقط بعد توحيد عدد المسافرين والتواريخ والخدمات.", en: "Official guidance emphasizes clear disclosure of fees, taxes, and additions. Compare offers only after aligning travelers, dates, and services." },
        checks: [],
      },
    ],
    sources: [
      { label: { ar: "وزارة السياحة: حقوق السائح", en: "Ministry of Tourism: Tourist Rights" }, href: MINISTRY_RIGHTS },
      { label: { ar: "وزارة السياحة: الأسئلة الشائعة", en: "Ministry of Tourism: FAQs" }, href: MINISTRY_FAQ },
      { label: { ar: "الهيئة العامة للطيران المدني: حماية حقوق المسافرين", en: "GACA: Passenger Rights Protection Regulations" }, href: GACA_RIGHTS },
    ],
  },
  {
    slug: "cancellation-and-changes",
    title: { ar: "راجع الإلغاء والتعديل والاسترداد", en: "Review cancellation, changes, and refunds" },
    description: { ar: "أسئلة عملية لتعرف التزامك المالي قبل تأكيد العرض.", en: "Practical questions to understand your financial commitment before confirmation." },
    reviewedAt: "2026-09-27",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "حوّل السياسة إلى إجابات محددة", en: "Turn the policy into specific answers" },
        body: { ar: "اطلب سياسة الإلغاء والتعديل مكتوبة لكل جزء من العرض؛ فقد تختلف تذكرة الطيران عن الفندق أو النقل.", en: "Request written cancellation and change terms for every part of the offer; flight, hotel, and transfer terms can differ." },
        checks: [
          { ar: "ما آخر موعد للإلغاء دون غرامة؟", en: "What is the last penalty-free cancellation time?" },
          { ar: "ما الغرامة بعد ذلك، ومن يصدر الاسترداد؟", en: "What is the later penalty, and who issues the refund?" },
          { ar: "هل التعديل متاح، وما فرق السعر أو الرسوم؟", en: "Are changes allowed, and what fare difference or fee applies?" },
          { ar: "ماذا يحدث إذا ألغى مقدم الخدمة؟", en: "What happens if the provider cancels?" },
        ],
      },
      {
        heading: { ar: "احتفظ بما وافقت عليه", en: "Keep what you agreed to" },
        body: { ar: "احفظ نسخة مؤرخة من العرض والفاتورة والسياسة المكتوبة. لا يستبدل تحليل سافر بوعي شروط مقدم الخدمة أو الجهة التنظيمية.", en: "Keep dated copies of the offer, invoice, and written policy. SafrBwai analysis does not replace provider terms or regulator rules." },
        checks: [],
      },
    ],
    sources: [
      { label: { ar: "وزارة السياحة: حقوق السائح", en: "Ministry of Tourism: Tourist Rights" }, href: MINISTRY_RIGHTS },
      { label: { ar: "الهيئة العامة للطيران المدني: حماية حقوق المسافرين", en: "GACA: Passenger Rights Protection Regulations" }, href: GACA_RIGHTS },
    ],
  },
  {
    slug: "transit-and-baggage",
    title: { ar: "راجع الترانزيت والأمتعة قبل الحجز", en: "Review transit and baggage before booking" },
    description: { ar: "تحقق من متطلبات العبور وتفاصيل الأمتعة التي قد تغيّر القرار.", en: "Check transit requirements and baggage details that can change the decision." },
    reviewedAt: "2026-09-27",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "افحص مسار العبور كاملًا", en: "Check the complete transit route" },
        body: { ar: "تعتمد متطلبات الجواز والتأشيرة والصحة على الجنسية والوجهة ومسار العبور، وقد تتغير. استخدم مصدرًا رسميًا وحديثًا ثم أكد النتيجة مع شركة الطيران.", en: "Passport, visa, and health requirements depend on nationality, destination, and transit route and can change. Use a current official source, then confirm with the airline." },
        checks: [
          { ar: "اكتب كل دولة ومطار عبور ومدة التوقف.", en: "List every transit country, airport, and connection time." },
          { ar: "تحقق من تغيير المطار أو مبنى الركاب والحاجة لدخول الدولة.", en: "Check airport or terminal changes and whether entry is required." },
          { ar: "أكد أن جميع المقاطع على حجز واحد أو افهم مخاطر الحجوزات المنفصلة.", en: "Confirm whether all segments share one booking, or understand separate-ticket risk." },
        ],
      },
      {
        heading: { ar: "اطلب تفاصيل الأمتعة بالأرقام", en: "Ask for numeric baggage details" },
        body: { ar: "يجب أن يوضح الحجز عدد القطع وأبعادها ووزنها لكل مسافر ومقطع. عبارة «الأمتعة مشمولة» وحدها غير كافية لاتخاذ القرار.", en: "The booking should state baggage count, dimensions, and weight for each traveler and segment. “Baggage included” alone is insufficient." },
        checks: [],
      },
    ],
    sources: [
      { label: { ar: "مركز السفر التابع للاتحاد الدولي للنقل الجوي", en: "IATA Travel Centre" }, href: IATA_TRAVEL_CENTRE },
      { label: { ar: "الهيئة العامة للطيران المدني: حماية حقوق المسافرين", en: "GACA: Passenger Rights Protection Regulations" }, href: GACA_RIGHTS },
    ],
  },
] as const;

export function getReviewedGuides(): readonly TravelGuide[] {
  return TRAVEL_GUIDES.filter((guide) => guide.status === "reviewed");
}

export function getGuide(slug: string): TravelGuide | undefined {
  return TRAVEL_GUIDES.find((guide) => guide.slug === slug);
}
