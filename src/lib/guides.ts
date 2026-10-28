import type { Locale } from "@/lib/i18n/config";

type Localized = Readonly<Record<Locale, string>>;

/** Where a guide sits in the traveler's journey: choosing a destination, booking, or getting ready to travel. */
export type GuideStage = "destination" | "booking" | "travel";

export type TravelGuide = Readonly<{
  slug: string;
  stage: GuideStage;
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
const UK_MALDIVES_ENTRY = "https://www.gov.uk/foreign-travel-advice/maldives/entry-requirements";
const VELANA_ARRIVAL = "https://velana.macl.aero/guide/arrival";
const SAUDI_MOFA = "https://www.mofa.gov.sa/";

export const TRAVEL_GUIDES: readonly TravelGuide[] = [
  {
    slug: "total-price-and-inclusions",
    stage: "booking",
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
    stage: "booking",
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
    stage: "booking",
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
  {
    slug: "maldives-trip-planning",
    stage: "destination",
    title: { ar: "المالديف: هل تناسبك وكيف تخطط لها", en: "The Maldives: who it suits and how to plan" },
    description: {
      ar: "لمن تناسب المالديف، وكيف تؤثر الانتقالات والوجبات وموسم السفر على مدة الرحلة وميزانيتها.",
      en: "Who the Maldives suits, and how transfers, meals, and season shape trip length and budget.",
    },
    reviewedAt: "2026-10-28",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "لمن تناسب", en: "Who it suits" },
        body: {
          ar: "المالديف رحلة منتجع: أغلب الإقامة في منتجعات يأخذ كل منها جزيرة، والنشاط اليومي يدور حول البحر والراحة. تناسب الأزواج والعائلات التي تريد الهدوء والأنشطة البحرية، وتناسب أقل من يريد التنقل بين مدن أو تجربة أسواق ومطاعم متنوعة. لذلك اختيار المنتجع هو عمليًا اختيار الرحلة.",
          en: "The Maldives is a resort trip: most stays are in resorts that each occupy an island, and days revolve around the sea and rest. It suits couples and families after calm and water activities, and suits less those who want to move between cities or explore varied markets and restaurants. Choosing the resort is, in practice, choosing the trip.",
        },
        checks: [
          { ar: "حدد أولويتك: بحر وشعاب، أو هدوء، أو أنشطة للأطفال.", en: "Set your priority: sea and reefs, quiet, or activities for children." },
          { ar: "اسأل عن المسافة بين المطار والمنتجع ونوع الانتقال قبل المقارنة بالسعر.", en: "Ask about the airport-to-resort distance and transfer type before comparing on price." },
        ],
      },
      {
        heading: { ar: "متى تسافر وكم يومًا", en: "When to go and for how long" },
        body: {
          ar: "يختلف الطقس والبحر حسب الموسم، والأسعار ترتفع عادة في فترات الإجازات. احسب يومي الوصول والمغادرة جزءًا من الرحلة لأن الانتقال إلى المنتجع ومنه يأخذ وقتًا. إذا كانت الرحلة قصيرة فالمنتجع الأقرب أو الأسهل انتقالًا يعطيك وقتًا أطول على الجزيرة.",
          en: "Weather and sea conditions vary by season, and prices usually rise in holiday periods. Count arrival and departure days as part of the trip, since resort transfers take time. On a short trip, a closer or easier-to-reach resort gives you more time on the island.",
        },
        checks: [
          { ar: "راجع حالة الطقس لفترة سفرك من مصدر رسمي قريب من الموعد.", en: "Check the weather for your dates from an official source close to departure." },
          { ar: "لا تحجز أقل عدد ليالٍ ممكن دون حساب يومي الانتقال.", en: "Do not book the minimum nights without counting the two transfer days." },
        ],
      },
      {
        heading: { ar: "ما الذي يحدد الميزانية", en: "What drives the budget" },
        body: {
          ar: "سعر الليلة ليس التكلفة كاملة. عادة تؤثر في المجموع: نوع الفيلا، وخطة الوجبات (في جزيرة المنتجع لا توجد غالبًا مطاعم خارجه)، وتكلفة الانتقال التي قد تُحسب لكل شخص وبشكل منفصل عن الإقامة، والضرائب ورسوم الخدمة، والأنشطة والرحلات البحرية. لا نذكر أسعارًا هنا لأنها تتغير؛ اطلبها مكتوبة.",
          en: "The nightly rate is not the full cost. Totals usually depend on villa type, meal plan (island resorts rarely have restaurants outside them), the transfer cost, which may be per person and separate from the stay, taxes and service charges, and activities and excursions. We list no prices because they change; get them in writing.",
        },
        checks: [
          { ar: "اطلب السعر شاملًا الانتقال والضرائب لكل الأشخاص.", en: "Ask for a price that includes transfers and taxes for everyone." },
          { ar: "قارن المنتجعات على خطة الوجبات نفسها.", en: "Compare resorts on the same meal plan." },
        ],
      },
      {
        heading: { ar: "التنقل: الطائرة المائية والقارب والرحلات الداخلية", en: "Getting there: seaplane, boat, and domestic flights" },
        body: {
          ar: "يصل المسافر إلى مطار فيلانا الدولي في ماليه، ثم ينتقل إلى المنتجع بقارب سريع أو بطائرة مائية أو برحلة داخلية ثم قارب حسب موقعه. لكل منتجع ومشغّل مواعيده، ورحلات الطائرة المائية تعمل في ساعات النهار عادة ولها حد للأمتعة قد يختلف عن رحلتك الدولية. إذا وصلت متأخرًا فقد تحتاج ليلة قرب المطار.",
          en: "Travelers arrive at Velana International Airport in Malé, then reach the resort by speedboat, seaplane, or a domestic flight then boat, depending on location. Each resort and operator sets its own schedule; seaplanes usually fly in daylight and can have a baggage limit that differs from your international flight. Arriving late may mean a night near the airport.",
        },
        checks: [
          { ar: "اسأل عن آخر موعد وصول يسمح بالانتقال في اليوم نفسه، ولا تعتمد على موعد عام.", en: "Ask for the latest arrival that still allows a same-day transfer; do not rely on a general cutoff." },
          { ar: "اسأل عن حد الأمتعة في الطائرة المائية.", en: "Ask about the seaplane baggage allowance." },
        ],
      },
      {
        heading: { ar: "أخطاء شائعة", en: "Common mistakes" },
        body: {
          ar: "حجز رحلة دولية تصل مساءً دون التأكد من مواعيد انتقال المنتجع، وافتراض أن الانتقال مشمول لأن العرض لم يذكره، ومقارنة منتجعين بخطتي وجبات مختلفتين، وتجاهل حد الأمتعة في الطائرة المائية.",
          en: "Booking an evening international arrival without checking resort transfer times, assuming the transfer is included because the offer is silent on it, comparing two resorts on different meal plans, and ignoring the seaplane baggage limit.",
        },
        checks: [],
      },
      {
        heading: { ar: "الدخول للمسافر السعودي", en: "Entry for Saudi travelers" },
        body: {
          ar: "تذكر المصادر الحكومية أن السائح يحصل على تأشيرة دخول عند الوصول، وأن الجواز يجب أن يكون صالحًا ستة أشهر على الأقل، وأن نموذج إقرار المسافر (IMUGA) يُعبأ إلكترونيًا خلال 96 ساعة قبل الوصول. هذه المتطلبات قد تتغير وتختلف حسب الجنسية، فتحقق منها لجوازك من مصدر رسمي قبل السفر.",
          en: "Government sources state that tourists receive a visa on arrival, that passports should be valid for at least six months, and that the IMUGA traveller declaration is completed online within 96 hours before arrival. These requirements can change and depend on nationality, so check them for your passport from an official source before you travel.",
        },
        checks: [
          { ar: "تحقق من صلاحية الجواز ومتطلبات الدخول لجنسيتك.", en: "Check passport validity and entry requirements for your nationality." },
          { ar: "عبّئ إقرار IMUGA في الموعد.", en: "Complete the IMUGA declaration on time." },
        ],
      },
    ],
    sources: [
      { label: { ar: "حكومة المملكة المتحدة: متطلبات دخول المالديف", en: "UK Government: Maldives entry requirements" }, href: UK_MALDIVES_ENTRY },
      { label: { ar: "مطار فيلانا الدولي: دليل الوصول", en: "Velana International Airport: arrival guide" }, href: VELANA_ARRIVAL },
      { label: { ar: "مركز السفر التابع للاتحاد الدولي للنقل الجوي", en: "IATA Travel Centre" }, href: IATA_TRAVEL_CENTRE },
    ],
  },
  {
    slug: "before-travel-checklist",
    stage: "travel",
    title: { ar: "قبل السفر: قائمة التجهيز", en: "Before you travel: a preparation checklist" },
    description: {
      ar: "الوثائق والانتقالات والتأمين ومتطلبات الدخول، مكتوبة للمسافر بجواز سعودي.",
      en: "Documents, transfers, insurance, and entry requirements, written for travelers on a Saudi passport.",
    },
    reviewedAt: "2026-10-28",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "الوثائق", en: "Documents" },
        body: {
          ar: "متطلبات الجواز والتأشيرة تحددها دولة الوجهة ودول العبور حسب جنسية المسافر. هذه القائمة مكتوبة للمسافر بجواز سفر سعودي؛ إذا كان معك مرافق بجنسية أخرى فمتطلباته قد تختلف ويجب التحقق منها لجوازه هو.",
          en: "Passport and visa requirements are set by the destination and any transit countries, based on the traveler's nationality. This list is written for travelers on a Saudi passport; a companion of another nationality may face different requirements, checked for their own passport.",
        },
        checks: [
          { ar: "تحقق من مدة صلاحية الجواز التي تطلبها الوجهة.", en: "Check the passport validity the destination requires." },
          { ar: "تحقق من التأشيرة أو التصريح الإلكتروني للوجهة ودول العبور.", en: "Check the visa or electronic authorization for the destination and transit countries." },
          { ar: "احتفظ بنسخ رقمية من الجواز والحجوزات خارج الهاتف أيضًا.", en: "Keep digital copies of passport and bookings, including off the phone." },
        ],
      },
      {
        heading: { ar: "الانتقالات", en: "Transfers" },
        body: {
          ar: "ثبّت كيف ستصل من المطار إلى الإقامة ومن يدفع ذلك، خاصة إذا كان الوصول متأخرًا أو يحتاج انتقالًا بحريًا أو رحلة داخلية.",
          en: "Confirm how you get from the airport to your stay and who pays, especially for late arrivals or transfers by sea or domestic flight.",
        },
        checks: [
          { ar: "احفظ اسم ورقم جهة الانتقال وموعد الاستقبال.", en: "Save the transfer provider's name, number, and pick-up time." },
          { ar: "اعرف البديل إذا تأخرت رحلتك.", en: "Know the fallback if your flight is delayed." },
        ],
      },
      {
        heading: { ar: "التأمين", en: "Insurance" },
        body: {
          ar: "اقرأ ما يغطيه التأمين فعلًا: العلاج، والإلغاء، والأمتعة، والأنشطة البحرية. بعض الدول تطلب تأمينًا بحد تغطية محدد ضمن متطلبات التأشيرة.",
          en: "Read what the policy actually covers: medical care, cancellation, baggage, and water activities. Some countries require insurance with a set minimum cover as part of the visa.",
        },
        checks: [
          { ar: "احتفظ برقم الطوارئ لشركة التأمين.", en: "Keep the insurer's emergency number." },
        ],
      },
      {
        heading: { ar: "متطلبات الدخول الإلكترونية", en: "Electronic entry requirements" },
        body: {
          ar: "بعض الدول تطلب نموذجًا أو تسجيلًا إلكترونيًا قبل الوصول، مثل إقرار المسافر في المالديف. هذه المتطلبات تتغير، فراجعها قرب موعد السفر من المصدر الرسمي.",
          en: "Some countries require an online form or registration before arrival, such as the Maldives traveller declaration. These change, so check them close to departure from the official source.",
        },
        checks: [],
      },
    ],
    sources: [
      { label: { ar: "وزارة الخارجية السعودية", en: "Saudi Ministry of Foreign Affairs" }, href: SAUDI_MOFA },
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
