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
    /** Omitted when the source page shows no publication date. */
    publishedAt?: string;
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
const GACA_PASSENGER_RIGHTS =
  "https://gaca.gov.sa/-/media/Files/PDF/LawsAndRegulation/Consumer-Protection/Passenger-Rights-Protection-Regulations-EN.pdf";
const SPA_RIYADH_AIRPORT_SUSPENDED = "https://www.spa.gov.sa/en/N2697867";
const SPA_RIYADH_AIRPORT_EXTENDED = "https://www.spa.gov.sa/en/N2699133";
const TIMEOUT_RIYADH_AIRPORT_STATUS = "https://www.timeoutriyadh.com/news/riyadh-airport-latest-update";
const WEGO_RIYADH_AIRPORT_STATUS = "https://blog.wego.com/is-riyadh-airport-open-live-status-2026/";
const EU_EES_FULLY_OPERATIONAL =
  "https://home-affairs.ec.europa.eu/news/entryexit-system-ees-fully-operational-2026-04-10_en";
const EU_EES_ETIAS_DIFFERENCES =
  "https://home-affairs.ec.europa.eu/news/main-differences-between-ees-and-etias-what-travellers-need-know-2026-04-28_en";
const EU_EES_FAQ = "https://travel-europe.europa.eu/en/ees/faq";
const EU_ETIAS_POLICY =
  "https://home-affairs.ec.europa.eu/policies/schengen/smart-borders/european-travel-information-authorisation-system_en";
const EU_SAUDI_VISA_DECISION =
  "https://home-affairs.ec.europa.eu/document/download/d22b298f-18db-48b1-bb53-cc4114bc40b3_en";
const JNTO_DEPARTURE_TAX = "https://www.japan.travel/en/ca/news/japans-international-tourist-tax-is-increasing/";
const NTA_DEPARTURE_TAX = "https://www.nta.go.jp/english/taxes/indirect/basic_knowledge.htm";
const KYOTO_LODGING_TAX = "https://www.city.kyoto.lg.jp/gyozai/page/0000345893.html";
const KYOTO_LODGING_TAX_GUIDE = "https://kyoto.travel/en/news/tax-change/";

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
  {
    slug: "flight-cancelled-saudi-airports-rights",
    category: { ar: "حقوق المسافر", en: "Passenger rights" },
    title: {
      ar: "رحلتك من الرياض أو الدمام أُلغيت؟ حقوقك وخطواتك الآن",
      en: "Flight from Riyadh or Dammam cancelled? Your rights and next steps",
    },
    description: {
      ar: "اضطراب الرحلات في مطارات المملكة مستمر. ماذا تقول لائحة حقوق المسافرين عن الاسترداد والرحلة البديلة والتعويض، وما الذي تفعله قبل التوجه إلى المطار.",
      en: "Flight disruption at Saudi airports continues. What the passenger rights regulation says about refunds, alternative flights and compensation, and what to do before heading to the airport.",
    },
    publishedAt: "2026-10-21",
    reviewedAt: "2026-10-21",
    status: "published",
    priority: 4,
    sections: [
      {
        heading: { ar: "ماذا حدث؟", en: "What happened?" },
        body: {
          ar: "أعلنت الهيئة العامة للطيران المدني في 10 أكتوبر 2026 تعليق العمليات في مطار الملك خالد الدولي بالرياض بعد هجوم استهدفه، ثم أعلنت في 12 أكتوبر تمديد التعليق لاستكمال التحقق من سلامة المطار وجاهزيته. بعد ذلك تباينت التقارير: دليل سفر محدَّث في 20 أكتوبر ذكر أن المطار أُعيد فتحه في 18 أكتوبر مع اشتراط إذن مسبق من الهيئة لكل رحلة، بينما ذكرت Time Out Riyadh في 21 أكتوبر أن الهيئة لم تعلن موعد إعادة الفتح بعد. ومددت شركات طيران عدة إلغاء رحلاتها إلى الرياض والدمام، بعضها حتى نهاية أكتوبر. لم نجد إعلانًا رسميًا بإعادة الفتح، لذلك نعرض هذه المعلومات كما وردت حتى 21 أكتوبر.",
          en: "On October 10, 2026, the General Authority of Civil Aviation (GACA) announced that operations at King Khalid International Airport in Riyadh were suspended after an attack, and on October 12 it extended the suspension while it verified the airport's safety and readiness. Reports then diverged: a travel guide updated on October 20 said the airport reopened on October 18 with prior GACA permission required for every flight, while Time Out Riyadh reported on October 21 that GACA had not yet announced a reopening date. Several airlines extended cancellations to Riyadh and Dammam, some until the end of October. We found no official reopening announcement, so this is reported information as of October 21.",
        },
        claimType: "reported",
        checks: [],
      },
      {
        heading: { ar: "ما الذي تقوله اللائحة؟", en: "What does the regulation say?" },
        body: {
          ar: "تنص لائحة حماية حقوق المسافرين على أن الناقل لا يلغي رحلة مجدولة إلا لقوة قاهرة أو لأسباب سلامة وأمن تستند إلى تقارير تعتمدها الهيئة. وعند الإلغاء يُعرض عليك بديل، فإن فسخت العقد فلك استرداد كامل قيمة التذكرة، بما فيها الرسوم الإضافية التي دفعتها لإتمام الحجز. وفي الإلغاء العادي يُضاف تعويض بحسب موعد إبلاغك: 50٪ من قيمة الرحلة المتبقية إذا أُبلغت قبل 60 إلى 14 يومًا، و75٪ إذا أُبلغت قبل 14 يومًا إلى 24 ساعة، و150٪ إذا أُبلغت خلال آخر 24 ساعة.",
          en: "GACA's Passenger Rights Protection Regulations say a carrier may cancel a scheduled flight only for force majeure or for safety and security reasons based on GACA-approved reports. When a flight is cancelled you are offered an alternative; if you terminate the contract, you get a full refund of the ticket, including additional fees paid to complete the booking. In an ordinary cancellation, compensation is added by notice period: 50% of the remaining flight's value with 60 to 14 days' notice, 75% with 14 days to 24 hours, and 150% within the last 24 hours.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "هل ينطبق التعويض على الإلغاء الحالي؟", en: "Does compensation apply to the current cancellations?" },
        body: {
          ar: "تعفي اللائحة الناقل من التعويض في حالات القوة القاهرة المثبتة بتقارير تعتمدها الهيئة، لكنها تُلزمه بإبلاغ المسافرين وتقديم خدمات المساندة، وتسمح لك بفسخ العقد واسترداد كامل قيمة التذكرة إذا امتد الحدث أكثر من 3 ساعات في الرحلات الداخلية أو 6 ساعات في الدولية. لذلك الأرجح في الإلغاءات المرتبطة بإغلاق المطار أن تحصل على استرداد كامل أو رحلة بديلة، دون تعويض إضافي. ولا يحق للناقل الاحتجاج بالقوة القاهرة إذا كان السبب عطلًا فنيًا أو ظروفًا تشغيلية أو جدولة أو تقصيرًا منه.",
          en: "The regulation exempts the carrier from compensation in force majeure cases backed by GACA-approved reports, but it still has to keep passengers informed and provide support services, and you may terminate the contract for a full refund if the event lasts more than 3 hours on domestic flights or 6 hours on international ones. So for cancellations tied to the airport closure, a full refund or an alternative flight is the likely outcome, without extra compensation. A carrier cannot claim force majeure for a technical fault, operational conditions, scheduling, or its own negligence.",
        },
        claimType: "inference",
        checks: [],
      },
      {
        heading: { ar: "ماذا تفعل الآن؟", en: "What to do now" },
        body: {
          ar: "تعامل مع رحلتك على أنها متغيرة حتى تتأكد من الناقل، ووثّق كل طلب تقدمه.",
          en: "Treat your flight as subject to change until the carrier confirms it, and keep a record of every request you make.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "تحقق من حالة الرحلة في تطبيق شركة الطيران أو موقعها قبل التوجه إلى المطار، ولا تكتفِ بالتذكرة.", en: "Check the flight status in the airline's app or website before going to the airport, not just your ticket." },
          { ar: "اطلب كتابيًا ما تختاره: رحلة بديلة أو استرداد كامل يشمل رسوم المقعد والأمتعة، واحفظ رقم الطلب.", en: "Ask in writing for your choice, an alternative flight or a full refund including seat and baggage fees, and keep the reference number." },
          { ar: "إن حجزت عبر وكالة أو موقع وسيط، فاطلب الاسترداد من الجهة التي دفعت لها، واطلب منها تأكيد موقف الناقل.", en: "If you booked through an agency or a third-party site, request the refund from whoever you paid and ask them to confirm the carrier's position." },
          { ar: "راجع الفندق والنقل المرتبطين بالرحلة، فإلغاء الطيران لا يلغيهما تلقائيًا.", en: "Review the hotel and transfers tied to the trip; a flight cancellation does not cancel them automatically." },
          { ar: "إذا لم يتجاوب الناقل مع طلبك، فقدّم شكوى إلى الهيئة العامة للطيران المدني.", en: "If the carrier does not respond to your request, file a complaint with GACA." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "لائحة حماية حقوق المسافرين", en: "Passenger Rights Protection Regulations" },
        publisher: "General Authority of Civil Aviation",
        href: GACA_PASSENGER_RIGHTS,
        sourceType: "official",
      },
      {
        label: { ar: "تعليق العمليات في مطار الملك خالد الدولي", en: "Operations suspended at King Khalid International Airport" },
        publisher: "Saudi Press Agency (GACA statement)",
        href: SPA_RIYADH_AIRPORT_SUSPENDED,
        publishedAt: "2026-10-10",
        sourceType: "official",
      },
      {
        label: { ar: "تمديد تعليق العمليات للتحقق من السلامة", en: "Suspension extended for safety checks" },
        publisher: "Saudi Press Agency (GACA statement)",
        href: SPA_RIYADH_AIRPORT_EXTENDED,
        publishedAt: "2026-10-12",
        sourceType: "official",
      },
      {
        label: { ar: "هل مطار الرياض مفتوح؟", en: "Is Riyadh Airport open?" },
        publisher: "Time Out Riyadh",
        href: TIMEOUT_RIYADH_AIRPORT_STATUS,
        publishedAt: "2026-10-21",
        sourceType: "editorial",
      },
      {
        label: { ar: "حالة مطار الرياض والرحلات", en: "Riyadh Airport status and flights" },
        publisher: "Wego",
        href: WEGO_RIYADH_AIRPORT_STATUS,
        publishedAt: "2026-10-20",
        sourceType: "editorial",
      },
    ],
  },
  {
    slug: "schengen-2026-ees-etias-saudi-travelers",
    category: { ar: "التأشيرات والدخول", en: "Visas and entry" },
    title: {
      ar: "أوروبا 2026: تأشيرتك كما هي، والبصمة عند الحدود جديدة",
      en: "Europe in 2026: your visa is unchanged, the border check is new",
    },
    description: {
      ar: "نظام الدخول والخروج الأوروبي يعمل بالكامل منذ أبريل، و ETIAS لا يخص من يحتاج تأشيرة شنغن. ما الذي تغيّر على المسافر السعودي، وكيف تتجنب المواقع المضللة.",
      en: "Europe's Entry/Exit System has been fully operational since April, and ETIAS does not apply to travelers who need a Schengen visa. What changed for Saudi travelers, and how to avoid misleading websites.",
    },
    publishedAt: "2026-10-21",
    reviewedAt: "2026-10-21",
    status: "published",
    priority: 5,
    sections: [
      {
        heading: { ar: "ما الذي تغيّر؟", en: "What changed?" },
        body: {
          ar: "أصبح نظام الدخول والخروج الأوروبي (EES) يعمل بالكامل في دول شنغن منذ 10 أبريل 2026، بعد أن بدأ تطبيقه تدريجيًا في 12 أكتوبر 2025. يسجّل النظام دخول المسافرين غير الأوروبيين في الإقامات القصيرة وخروجهم إلكترونيًا مع بياناتهم الحيوية. ولأن حامل التأشيرة يقدّم بصماته عند طلب التأشيرة، فالذي يُسجَّل له عند الحدود هو صورة الوجه، ولا تُؤخذ بصمات الأطفال دون 12 عامًا.",
          en: "Europe's Entry/Exit System (EES) has been fully operational across the Schengen countries since April 10, 2026, after a phased start on October 12, 2025. It records short-stay entries and exits of non-EU travelers electronically with biometric data. Because visa holders give fingerprints when applying for the visa, only a facial image is recorded for them at the border, and children under 12 are not fingerprinted.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "ما الذي لم يتغير؟", en: "What did not change?" },
        body: {
          ar: "ما زال المواطن السعودي يحتاج تأشيرة شنغن للإقامات القصيرة. وقاعدة الإقامة القصيرة باقية كما هي: 90 يومًا خلال أي 180 يومًا، تُحسب مجتمعة في جميع الدول التي تطبق النظام. النظام الجديد يغيّر طريقة التسجيل والحساب عند الحدود، لا مدة الإقامة المسموح بها.",
          en: "Saudi citizens still need a Schengen visa for short stays. The short-stay rule is unchanged: 90 days in any 180-day period, counted together across all countries using the system. The new system changes how stays are recorded and counted at the border, not how long you may stay.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "ETIAS ليس لك", en: "ETIAS is not for you" },
        body: {
          ar: "نظام ETIAS لم يبدأ العمل بعد، ولا تُقبل أي طلبات حاليًا، وسيعلن الاتحاد الأوروبي موعد إطلاقه قبل أشهر. وهو مخصص لمواطني الدول المعفاة من التأشيرة، أما من يحتاج تأشيرة شنغن فلا يحتاج ETIAS. معنى ذلك عمليًا أن أي موقع يعرض عليك اليوم إصدار ETIAS بمقابل لا يقدّم خدمة رسمية.",
          en: "ETIAS is not operating yet and no applications are being accepted; the EU will announce its launch date months in advance. It is for nationals of visa-exempt countries, and travelers who need a Schengen visa do not need ETIAS. In practice, any website offering to issue an ETIAS for a fee today is not providing an official service.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "كيف تستعد؟", en: "How to prepare" },
        body: {
          ar: "إن كنت تسافر إلى أوروبا بانتظام، فقرار المفوضية الأوروبية الصادر في 22 أبريل 2024 يتيح للمواطنين السعوديين المقيمين في المملكة الحصول على تأشيرة متعددة الدخول صالحة حتى خمس سنوات عند استيفاء الشروط، والقرار في كل طلب للقنصلية.",
          en: "If you travel to Europe regularly, a European Commission decision of April 22, 2024 allows Saudi citizens residing in Saudi Arabia to receive a multiple-entry visa valid for up to five years when they meet the conditions; each application is decided by the consulate.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "قدّم طلب التأشيرة عبر سفارة الدولة أو مركز التأشيرات المعتمد لها، لا عبر مواقع تعرض تسهيلًا بمقابل غير واضح.", en: "Apply through the country's embassy or its authorized visa center, not through sites offering facilitation for an unclear fee." },
          { ar: "لا تدفع لأي موقع يبيع ETIAS: النظام لم يبدأ، ولا ينطبق على من يحتاج تأشيرة.", en: "Do not pay any site selling ETIAS: the system has not started and does not apply to visa holders." },
          { ar: "احسب أيامك داخل شنغن بنفسك قبل كل رحلة، فالنظام يسجّلها آليًا عبر الدول كلها.", en: "Count your Schengen days yourself before each trip; the system records them automatically across all countries." },
          { ar: "خصّص وقتًا إضافيًا عند أول عبور للحدود، خاصة إذا كان بعده ترانزيت قصير.", en: "Allow extra time at your first border crossing, especially before a short connection." },
          { ar: "اسأل القنصلية عن التأشيرة متعددة الدخول طويلة المدة إن كنت تسافر بانتظام.", en: "Ask the consulate about a long-validity multiple-entry visa if you travel regularly." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "نظام الدخول والخروج يعمل بالكامل", en: "The Entry/Exit System is fully operational" },
        publisher: "European Commission — Migration and Home Affairs",
        href: EU_EES_FULLY_OPERATIONAL,
        publishedAt: "2026-04-10",
        sourceType: "official",
      },
      {
        label: { ar: "الفرق بين EES و ETIAS للمسافرين", en: "Main differences between the EES and ETIAS" },
        publisher: "European Commission — Migration and Home Affairs",
        href: EU_EES_ETIAS_DIFFERENCES,
        publishedAt: "2026-04-28",
        sourceType: "official",
      },
      {
        label: { ar: "أسئلة شائعة عن نظام الدخول والخروج", en: "EES frequently asked questions" },
        publisher: "European Union — Travel to Europe",
        href: EU_EES_FAQ,
        sourceType: "official",
      },
      {
        label: { ar: "نظام ETIAS: الحالة ومن يشمله", en: "ETIAS: status and who it covers" },
        publisher: "European Commission — Migration and Home Affairs",
        href: EU_ETIAS_POLICY,
        sourceType: "official",
      },
      {
        label: { ar: "قرار تأشيرات المواطنين السعوديين متعددة الدخول", en: "Decision on multiple-entry visas for Saudi nationals" },
        publisher: "European Commission",
        href: EU_SAUDI_VISA_DECISION,
        publishedAt: "2024-04-22",
        sourceType: "official",
      },
    ],
  },
  {
    slug: "japan-trip-hidden-taxes-2026",
    category: { ar: "التكلفة الكاملة", en: "Full trip cost" },
    title: {
      ar: "رحلة اليابان: ضريبتان قد لا تظهران في عرضك",
      en: "Japan trip: two taxes your quote may not show",
    },
    description: {
      ar: "ضريبة مغادرة اليابان تضاعفت ثلاث مرات منذ يوليو 2026، وضريبة الإقامة في كيوتو قد تصل إلى 10,000 ين لليلة للشخص. كيف تحسبهما قبل الحجز.",
      en: "Japan's departure tax tripled in July 2026, and Kyoto's accommodation tax can reach 10,000 yen per person per night. How to account for both before you book.",
    },
    publishedAt: "2026-10-21",
    reviewedAt: "2026-10-21",
    status: "published",
    priority: 6,
    sections: [
      {
        heading: { ar: "ضريبة المغادرة", en: "The departure tax" },
        body: {
          ar: "رفعت اليابان ضريبة السياحة الدولية التي تُفرض عند مغادرة البلاد من 1,000 ين إلى 3,000 ين للشخص في كل مغادرة، اعتبارًا من 1 يوليو 2026. وتحصّلها شركات الطيران والسفن عادة بإضافتها إلى سعر التذكرة، ويُعفى منها الأطفال دون سنتين. وتبقى الضريبة السابقة (1,000 ين) على التذاكر المؤهلة الصادرة حتى 30 يونيو 2026.",
          en: "Japan raised its International Tourist Tax, charged on departure, from 1,000 yen to 3,000 yen per person per departure from July 1, 2026. Airlines and ship operators usually collect it by adding it to the ticket price, and children under two are exempt. The previous 1,000 yen rate still applies to eligible tickets issued by June 30, 2026.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "ضريبة الإقامة في كيوتو", en: "Kyoto's accommodation tax" },
        body: {
          ar: "منذ 1 مارس 2026 أصبحت ضريبة الإقامة في كيوتو متدرجة بحسب سعر الليلة للشخص الواحد: 200 ين إذا كان أقل من 6,000 ين، و400 ين من 6,000 إلى أقل من 20,000، و1,000 ين من 20,000 إلى أقل من 50,000، و4,000 ين من 50,000 إلى أقل من 100,000، و10,000 ين إذا بلغ 100,000 ين فأكثر. ويُحسب السعر على الغرفة والخدمات المرتبطة بها دون الوجبات وضريبة الاستهلاك، وتُدفع عادة في الفندق، إلا إذا دفعتها مسبقًا عبر موقع الحجز أو الوكالة.",
          en: "Since March 1, 2026, Kyoto's accommodation tax is tiered by the per-person nightly rate: 200 yen under 6,000 yen, 400 yen from 6,000 to under 20,000, 1,000 yen from 20,000 to under 50,000, 4,000 yen from 50,000 to under 100,000, and 10,000 yen at 100,000 yen or more. The rate covers the room and related service charges, excluding meals and consumption tax, and is usually paid at the property unless you already paid it through a booking site or agency.",
        },
        claimType: "fact",
        checks: [],
      },
      {
        heading: { ar: "ماذا يعني ذلك لميزانيتك؟", en: "What it means for your budget" },
        body: {
          ar: "مثال حسابي: شخصان يقيمان 3 ليالٍ في كيوتو بسعر 25,000 ين لليلة للشخص الواحد يدفعان 1,000 ين × 2 × 3 = 6,000 ين ضريبة إقامة، ثم 3,000 ين × 2 = 6,000 ين ضريبة مغادرة، أي 12,000 ين لا تظهر غالبًا في السعر الإعلاني للفندق. وفي فندق يبلغ سعره 100,000 ين لليلة للشخص ترتفع ضريبة الإقامة وحدها إلى 10,000 ين للشخص في كل ليلة.",
          en: "A worked example: two people staying 3 nights in Kyoto at 25,000 yen per person per night pay 1,000 yen × 2 × 3 = 6,000 yen in accommodation tax, then 3,000 yen × 2 = 6,000 yen in departure tax, or 12,000 yen that the hotel's advertised rate often does not show. At 100,000 yen per person per night, the accommodation tax alone rises to 10,000 yen per person per night.",
        },
        claimType: "inference",
        checks: [],
      },
      {
        heading: { ar: "اسأل قبل أن تحجز", en: "Ask before you book" },
        body: {
          ar: "اطلب من الوكالة أو موقع الحجز أن يوضح أين تُحسب كل ضريبة، حتى تقارن العروض على أساس واحد.",
          en: "Ask the agency or booking site where each tax is counted, so you compare offers on the same basis.",
        },
        claimType: "recommendation",
        checks: [
          { ar: "هل ضريبة المغادرة محسوبة ضمن سعر تذكرة الطيران؟", en: "Is the departure tax included in the airfare?" },
          { ar: "هل ضريبة الإقامة في كيوتو مدفوعة مسبقًا، أم تُدفع في الفندق عند الوصول؟", en: "Is Kyoto's accommodation tax prepaid, or paid at the hotel on arrival?" },
          { ar: "احسب ضريبة الإقامة على سعر الليلة للشخص الواحد لا للغرفة كاملة، لأن الشرائح تُحتسب للشخص.", en: "Work out the accommodation tax on the per-person nightly rate, not the whole room, since the tiers are per person." },
          { ar: "إذا شمل برنامجك مدنًا يابانية أخرى، فاسأل عن ضرائب الإقامة المحلية فيها أيضًا.", en: "If your itinerary includes other Japanese cities, ask about their local accommodation taxes too." },
        ],
      },
    ],
    sources: [
      {
        label: { ar: "زيادة ضريبة السياحة الدولية في اليابان", en: "Japan's International Tourist Tax is increasing" },
        publisher: "Japan National Tourism Organization",
        href: JNTO_DEPARTURE_TAX,
        publishedAt: "2026-05-11",
        sourceType: "official",
      },
      {
        label: { ar: "ضريبة السياحة الدولية: معلومات أساسية", en: "International Tourist Tax: basic knowledge" },
        publisher: "National Tax Agency, Japan",
        href: NTA_DEPARTURE_TAX,
        sourceType: "official",
      },
      {
        label: { ar: "اعتماد تعديل ضريبة الإقامة اعتبارًا من 1 مارس 2026", en: "Accommodation tax revision from March 1, 2026 confirmed" },
        publisher: "Kyoto City",
        href: KYOTO_LODGING_TAX,
        publishedAt: "2025-10-03",
        sourceType: "official",
      },
      {
        label: { ar: "تغيير ضريبة الإقامة في كيوتو", en: "Kyoto's accommodation tax change" },
        publisher: "Kyoto City Official Travel Guide",
        href: KYOTO_LODGING_TAX_GUIDE,
        sourceType: "official",
      },
    ],
  },
] as const;

export function getPublishedInsights(): readonly TravelInsight[] {
  return TRAVEL_INSIGHTS.filter((insight) => insight.status === "published").sort(
    (a, b) => a.priority - b.priority
  );
}

/** The newest published insights for the homepage; same-day articles keep their priority order. */
export function getLatestInsights(count: number): readonly TravelInsight[] {
  return [...getPublishedInsights()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.priority - b.priority)
    .slice(0, count);
}

export function getInsight(slug: string): TravelInsight | undefined {
  return TRAVEL_INSIGHTS.find((insight) => insight.slug === slug);
}
