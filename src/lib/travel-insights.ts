import type { Locale } from "@/lib/i18n/config";

type Localized = Readonly<Record<Locale, string>>;

export type InsightClaimType = "fact" | "reported" | "inference" | "recommendation";

export type TravelInsight = Readonly<{
  slug: string;
  category: Localized;
  title: Localized;
  description: Localized;
  publishedAt: string;
  reviewedAt: string;
  status: "published" | "draft";
  priority: number;
  sections: readonly Readonly<{
    heading: Localized;
    body: Localized;
    claimType: InsightClaimType;
    checks: readonly Localized[];
  }>[];
  sources: readonly Readonly<{
    label: Localized;
    publisher: string;
    href: string;
    publishedAt: string;
    sourceType: "official" | "trade" | "editorial" | "research";
  }>[];
}>;

const FTC_TRAVEL_SCAMS =
  "https://consumer.ftc.gov/consumer-alerts/2026/06/how-avoid-travel-scam-summer";
const PHOCUSWIRE_PREDATORY_OTAS =
  "https://www.phocuswire.com/news/distribution/11-million-hotel-branded-ads-linked-predatory-otas-single-month";
const CNT_READERS_CHOICE =
  "https://www.cntraveler.com/inspiration/readers-choice-awards";
const CNT_ASIA_EDITOR_LETTER =
  "https://www.cntraveler.com/story/editors-letter-introducing-the-2026-readers-choice-awards";
const SKIFT_AI_BOOKING_GAP =
  "https://skift.com/2026/10/11/travel-ais-prove-it-phase-visibility-and-the-booking-gap/";
const AI_PLANNING_RESEARCH = "https://arxiv.org/abs/2609.26968";

export const TRAVEL_INSIGHTS: readonly TravelInsight[] = [
  {
    slug: "verify-hotel-booking-site",
    category: { ar: "حماية المسافر", en: "Traveler protection" },
    title: {
      ar: "هل حجزت من موقع الفندق الرسمي فعلًا؟",
      en: "Did you actually book on the hotel's official website?",
    },
    description: {
      ar: "إعلان يحمل اسم الفندق قد يقودك إلى وسيط يبدو رسميًا. هذه خطوات التحقق قبل إدخال بياناتك أو الدفع.",
      en: "An ad using a hotel's name can lead to a third party that looks official. Use these checks before entering details or paying.",
    },
    publishedAt: "2026-10-14",
    reviewedAt: "2026-10-14",
    status: "published",
    priority: 1,
    sections: [
      {
        heading: { ar: "ما الذي رُصد؟", en: "What was reported?" },
        body: {
          ar: "نشرت PhocusWire في أكتوبر 2026 تقريرًا عن إعلانات تحمل أسماء فنادق وتقود إلى مواقع حجز تابعة لجهات خارجية، وقد تبدو للزائر كأنها القناة الرسمية للفندق. الرقم الوارد في التقرير منسوب إلى تحليل أجرته شركة Operto، لذلك نتعامل معه كمعلومة منقولة، بينما تتمثل الخلاصة العملية في ضرورة التحقق من هوية جهة الحجز.",
          en: "PhocusWire reported in October 2026 on hotel-branded ads leading to third-party booking sites that can look like an official hotel channel. The figure in the story comes from analysis by Operto, so we treat it as reported information; the practical point is to verify who is taking the booking.",
        },
        claimType: "reported",
        checks: [],
      },
      {
        heading: { ar: "التحذير الرسمي", en: "The official warning" },
        body: {
          ar: "تحذر هيئة التجارة الفيدرالية الأمريكية من أن المحتالين قد يستخدمون إعلانًا مدفوعًا يحمل اسم شركة معروفة، أو رابطًا لموقع يشبه موقع الفندق أو شركة الطيران. وتوصي بالوصول إلى الموقع الصحيح مباشرة أو التحقق من نتائج البحث غير المدفوعة وبيانات التواصل.",
          en: "The U.S. Federal Trade Commission warns that scammers may use paid ads carrying a familiar company name or link to a site that resembles a hotel or airline website. It advises reaching the correct site directly or checking unpaid search results and contact details.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "افحص هذه النقاط قبل الدفع", en: "Check these points before paying" },
        body: {
          ar: "وجود وسيط لا يعني تلقائيًا أن الحجز احتيالي. المطلوب أن تعرف الجهة التي ستدفع لها، وما الذي ستلتزم به، ومن المسؤول عن التعديل أو الاسترداد.",
          en: "Using a third party does not automatically make a booking fraudulent. You need to know who receives the payment, what terms apply, and who handles changes or refunds.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "اكتب عنوان الموقع الرسمي بنفسك أو افتحه من قناة موثوقة للفندق.", en: "Type the official domain yourself or open it from a trusted hotel channel." },
          { ar: "راجع اسم الشركة في صفحة الدفع والفاتورة، وليس شعار الفندق فقط.", en: "Check the company name at checkout and on the invoice, not only the hotel logo." },
          { ar: "ثبّت السعر الإجمالي والعملة والضرائب والرسوم قبل إدخال البطاقة.", en: "Confirm the total price, currency, taxes, and fees before entering card details." },
          { ar: "اعرف من ينفذ الإلغاء أو التعديل، واحفظ نسخة من الشروط والتأكيد.", en: "Identify who handles cancellation or changes, and keep the terms and confirmation." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "تقرير عن إعلانات الحجز التي تحمل أسماء الفنادق", en: "Report on hotel-branded booking ads" },
        publisher: "PhocusWire",
        href: PHOCUSWIRE_PREDATORY_OTAS,
        publishedAt: "2026-10-09",
        sourceType: "trade",
      },
      {
        label: { ar: "كيف تتجنب احتيال مواقع السفر", en: "How to avoid travel website scams" },
        publisher: "U.S. Federal Trade Commission",
        href: FTC_TRAVEL_SCAMS,
        publishedAt: "2026-06-24",
        sourceType: "official",
      },
    ],
  },
  {
    slug: "award-winning-hotel-fit",
    category: { ar: "اختيار الفندق", en: "Hotel selection" },
    title: {
      ar: "فندق فائز عالميًا… هل هو الأنسب لرحلتك؟",
      en: "An award-winning hotel… is it right for your trip?",
    },
    description: {
      ar: "الجوائز تساعدك في تكوين قائمة أولية، لكنها لا تحسم الموقع ونوع الغرفة والخصوصية والتكلفة الفعلية.",
      en: "Awards can shape a shortlist, but they do not settle location, room type, privacy, or the real trip cost.",
    },
    publishedAt: "2026-10-14",
    reviewedAt: "2026-10-14",
    status: "published",
    priority: 2,
    sections: [
      {
        heading: { ar: "ماذا تعني الجائزة؟", en: "What does the award mean?" },
        body: {
          ar: "أعلنت Condé Nast Traveler نتائج Readers’ Choice Awards لعام 2026 في 6 أكتوبر، وتشمل قوائم للفنادق والمنتجعات والمنتجعات الصحية في مناطق عدة، منها تايلاند وإندونيسيا والمحيط الهندي. هذه اختيارات قراء المجلة، وهي إشارة تحريرية مفيدة لاختصار البحث الأولي.",
          en: "Condé Nast Traveler published its 2026 Readers’ Choice Awards on October 6, including hotel, resort, and spa lists across regions such as Thailand, Indonesia, and the Indian Ocean. These reader selections are a useful editorial signal for an initial shortlist.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "ما الذي لا تثبته الجائزة؟", en: "What does the award not prove?" },
        body: {
          ar: "التصنيف لا يثبت أن الفندق يناسب ميزانيتك أو هدف رحلتك، ولا يضمن التوافر أو أفضل سعر أو سهولة التنقل. الفندق الممتاز للأزواج قد لا يكون عمليًا لعائلة، والمنتجع المنعزل قد يرفع تكلفة ووقت الانتقالات.",
          en: "A ranking does not prove that a hotel fits your budget or trip purpose, and it does not guarantee availability, the best rate, or easy transport. A strong couples' hotel may be impractical for a family, while a secluded resort may increase transfer time and cost.",
        },
        claimType: "inference",
        checks: [],
      },
      {
        heading: { ar: "حوّل القائمة إلى قرار", en: "Turn the list into a decision" },
        body: {
          ar: "استخدم الجوائز لاختيار ثلاثة مرشحين، ثم قارنهم وفق احتياج رحلتك قبل طلب السعر النهائي.",
          en: "Use awards to choose three candidates, then compare them against your trip needs before requesting a final price.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "حدّد نوع الغرفة والإطلالة والسرير بوضوح، لأن اسم الفندق وحده لا يكفي.", en: "Confirm the room type, view, and bed; the hotel name alone is not enough." },
          { ar: "قِس وقت الانتقال إلى الأماكن المهمة في برنامجك، وليس المسافة فقط.", en: "Measure travel time to places in your itinerary, not distance alone." },
          { ar: "راجع مستوى الخصوصية والهدوء والخدمات الملائمة للأطفال أو شهر العسل.", en: "Review privacy, quietness, and services relevant to families or honeymoons." },
          { ar: "اطلب سعرًا نهائيًا يشمل الضرائب والنقل والوجبات وسياسة الإلغاء.", en: "Request a final price including taxes, transfers, meals, and cancellation terms." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "جوائز اختيار القراء 2026", en: "2026 Readers’ Choice Awards" },
        publisher: "Condé Nast Traveler",
        href: CNT_READERS_CHOICE,
        publishedAt: "2026-10-06",
        sourceType: "editorial",
      },
      {
        label: { ar: "رسالة التحرير عن نتائج 2026 وصعود آسيا", en: "Editor’s letter on the 2026 results and Asia" },
        publisher: "Condé Nast Traveler",
        href: CNT_ASIA_EDITOR_LETTER,
        publishedAt: "2026-10-06",
        sourceType: "editorial",
      },
    ],
  },
  {
    slug: "ai-trip-planning-human-review",
    category: { ar: "تقنية السفر", en: "Travel technology" },
    title: {
      ar: "الذكاء الاصطناعي خطط رحلتك… من يراجع الأخطاء؟",
      en: "AI planned your trip… who checks the mistakes?",
    },
    description: {
      ar: "استخدم الذكاء الاصطناعي لتسريع البحث، ثم راجع القيود الفعلية التي قد تغيّر البرنامج أو التكلفة.",
      en: "Use AI to speed up research, then review the real constraints that can change the itinerary or cost.",
    },
    publishedAt: "2026-10-14",
    reviewedAt: "2026-10-14",
    status: "published",
    priority: 3,
    sections: [
      {
        heading: { ar: "أين وصل الاستخدام؟", en: "Where does adoption stand?" },
        body: {
          ar: "ذكر تحليل نشرته Skift في 11 أكتوبر 2026 أن أدوات الذكاء الاصطناعي تغيّر اكتشاف خيارات السفر، بينما لا تزال الحجوزات المنسوبة إليها محدودة. كما أشار إلى أن العائد القابل للقياس يظهر حاليًا بصورة أوضح في الاستخدامات التشغيلية. بعض تفاصيل التقرير خلف اشتراك، لذلك نعرض هذه الخلاصة كمعلومة منقولة من النص المتاح.",
          en: "A Skift analysis published on October 11, 2026 said AI tools are changing travel discovery while bookings attributed to them remain limited. It also reported that measurable returns are currently clearer in operational uses. Some details sit behind a subscription, so this is reported information based on the accessible text.",
        },
        claimType: "reported",
        checks: [],
      },
      {
        heading: { ar: "لماذا تحتاج الخطة إلى إنسان؟", en: "Why does the plan need a human?" },
        body: {
          ar: "تشير دراسة عن دعم تخطيط السفر بالذكاء الاصطناعي إلى أن قيود المسافر وتفضيلاته تتضح وتتغير أثناء التخطيط. وهذا يعني أن البرنامج المقنع لغويًا قد يظل غير مناسب إذا تجاهل الوقت والميزانية والتنقل واحتياجات المسافرين.",
          en: "Research on AI planning support suggests that traveler constraints and preferences emerge and change during planning. A fluently written itinerary can still be unsuitable if it overlooks time, budget, transport, or traveler needs.",
        },
        claimType: "inference",
        checks: [],
      },
      {
        heading: { ar: "طريقة استخدام واعية", en: "A conscious way to use it" },
        body: {
          ar: "دع الأداة تقترح وتختصر، واجعل القرار النهائي مبنيًا على تحقق حديث من المصادر الرسمية ومقدم الخدمة.",
          en: "Let the tool suggest and summarize, then base the final decision on current checks with official sources and providers.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "تحقق من أوقات العمل والأيام المغلقة وتواريخ البرنامج.", en: "Verify opening hours, closed days, and itinerary dates." },
          { ar: "راجع زمن الانتقال الواقعي وتغيير المطارات أو محطات القطار.", en: "Check realistic transfer times and airport or rail-station changes." },
          { ar: "ثبت التأشيرة وشروط الدخول والعبور من المصدر الرسمي حسب الجنسية.", en: "Confirm visa, entry, and transit rules from official sources for the traveler's nationality." },
          { ar: "لا تعتمد سعرًا أو توافرًا أو سياسة إلغاء دون تحقق مباشر وحديث.", en: "Do not rely on a price, availability, or cancellation rule without a direct current check." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "مرحلة إثبات قيمة الذكاء الاصطناعي وفجوة الحجز", en: "Travel AI’s prove-it phase and booking gap" },
        publisher: "Skift",
        href: SKIFT_AI_BOOKING_GAP,
        publishedAt: "2026-10-11",
        sourceType: "trade",
      },
      {
        label: { ar: "كيف تشكل القيود والتفضيلات تخطيط السفر", en: "How constraints and preferences shape travel planning" },
        publisher: "arXiv",
        href: AI_PLANNING_RESEARCH,
        publishedAt: "2026-09-22",
        sourceType: "research",
      },
    ],
  },
] as const;

export function getPublishedInsights(): readonly TravelInsight[] {
  return TRAVEL_INSIGHTS.filter((insight) => insight.status === "published").sort(
    (a, b) => a.priority - b.priority
  );
}

export function getInsight(slug: string): TravelInsight | undefined {
  return TRAVEL_INSIGHTS.find((insight) => insight.slug === slug);
}
