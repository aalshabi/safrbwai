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
const VELANA_TRANSPORT = "https://velana.macl.aero/guide/transport";
const SAUDI_MOFA = "https://www.mofa.gov.sa/";
const SAUDIA = "https://www.saudia.com/";
const FLYNAS = "https://www.flynas.com/";

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
          ar: "يصل المسافر إلى مطار فيلانا الدولي في ماليه، ثم ينتقل إلى المنتجع بقارب سريع أو بطائرة مائية أو برحلة داخلية ثم قارب حسب موقعه. لكل منتجع ومشغّل مواعيده وشروطه وحدوده للأمتعة، وهي تُطلب منه مكتوبة لأنها لا تُنشر في مكان واحد. إذا وصلت متأخرًا فقد تحتاج ليلة قرب المطار.",
          en: "Travelers arrive at Velana International Airport in Malé, then reach the resort by speedboat, seaplane, or a domestic flight then boat, depending on location. Each resort and operator sets its own schedule, conditions and baggage limits, and these are worth getting in writing because they are not published in one place. Arriving late may mean a night near the airport.",
        },
        checks: [
          { ar: "اسأل المنتجع عن آخر موعد وصول يسمح بالانتقال في اليوم نفسه، ولا تعتمد على موعد عام.", en: "Ask for the latest arrival that still allows a same-day transfer; do not rely on a general cutoff." },
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
          ar: "يذكر دليل مطار فيلانا أن تأشيرة السياحة تُمنح عند الوصول لكل الجنسيات بلا موافقة مسبقة، وأن الجواز أو وثيقة السفر يجب أن تحمل منطقة قراءة آلية (MRZ) صالحة شهرًا على الأقل، وتذكر الإرشادات الحكومية البريطانية المدة نفسها وتضيف أن تأشيرة الوصول للسائح 30 يومًا. ويُعبأ نموذج إقرار المسافر (IMUGA) إلكترونيًا خلال 96 ساعة قبل وصول رحلتك. هذه المتطلبات قد تتغير وتختلف حسب الجنسية، فتحقق منها لجوازك من مصدر رسمي قبل السفر.",
          en: "Velana airport's arrival guide states that tourist visas are granted on arrival for all nationalities with no pre-approval, and that the passport or travel document must have a machine-readable zone valid for at least one month; UK government guidance gives the same validity and adds that the visa on arrival for a tourist is 30 days. The IMUGA traveller declaration is completed online within 96 hours before your flight arrives. These requirements can change and depend on nationality, so check them for your passport from an official source before you travel.",
        },
        checks: [
          { ar: "تحقق من صلاحية الجواز ومن متطلبات الدخول لجنسيتك من المصدر الرسمي.", en: "Check passport validity and entry requirements for your nationality." },
          { ar: "عبّئ إقرار IMUGA في الموعد.", en: "Complete the IMUGA declaration on time." },
        ],
      },
    ],
    sources: [
      { label: { ar: "حكومة المملكة المتحدة: متطلبات دخول المالديف", en: "UK Government: Maldives entry requirements" }, href: UK_MALDIVES_ENTRY },
      { label: { ar: "مطار فيلانا الدولي: دليل الوصول", en: "Velana International Airport: arrival guide" }, href: VELANA_ARRIVAL },
      { label: { ar: "مطار فيلانا الدولي: دليل التنقل", en: "Velana International Airport: transport guide" }, href: VELANA_TRANSPORT },
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
  {
    slug: "luggage-and-carry-on",
    stage: "travel",
    title: { ar: "كيف تختار حقيبة السفر والحقيبة اليدوية", en: "How to choose your suitcase and carry-on" },
    description: {
      ar: "مقارنة بين أنواع الحقائب، وما يجعلها عملية، ومقاسات المقصورة، وما تضعه في حقيبتك اليدوية.",
      en: "Comparing bag types, what makes them practical, cabin sizes, and what goes in your carry-on.",
    },
    reviewedAt: "2026-10-28",
    status: "reviewed",
    sections: [
      {
        heading: { ar: "اختر النوع حسب رحلتك", en: "Choose the type for your trip" },
        body: {
          ar: "لا توجد حقيبة أفضل لكل الرحلات. الحقيبة الصلبة (بولي كربونات مثلًا) تحمي ما بداخلها من الضغط والمطر، وتناسب الرحلات الجوية الطويلة والأغراض الهشة، لكنها لا تتمدد وقد تظهر عليها الخدوش. الحقيبة اللينة (القماشية) أخف غالبًا، وفيها جيوب خارجية، وتتمدد قليلًا، لكنها أقل حماية من الضغط والماء. حقيبة الظهر الكبيرة تناسب التنقل بين مدن وعلى الأرصفة والسلالم والقطارات، لكنها متعبة إذا ثقلت. حقيبة الدفل (الرياضية) مرنة وسهلة الحشو، وتناسب الرحلات القصيرة أو السيارة أكثر من المطارات الكبيرة.",
          en: "No bag suits every trip. A hard-shell case (polycarbonate, for example) protects against pressure and rain and suits long flights and fragile items, but it does not expand and scuffs show. A soft case is usually lighter, has outside pockets and some give, but protects less against pressure and water. A large backpack suits moving between cities, pavements, stairs and trains, but tires you once heavy. A duffel is flexible and easy to pack, better for short trips or the car than for large airports.",
        },
        checks: [
          { ar: "رحلة فيها تنقلات كثيرة بين مدن: حقيبة أصغر أو حقيبة ظهر.", en: "Many city-to-city moves: a smaller case or a backpack." },
          { ar: "رحلة إقامة واحدة أو عائلية: حقيبة كبيرة بعجلات أسهل.", en: "One stay or a family trip: a large wheeled case is easier." },
          { ar: "أغراض هشة أو هدايا: الحقيبة الصلبة أنسب.", en: "Fragile items or gifts: a hard case fits better." },
        ],
      },
      {
        heading: { ar: "ما الذي يجعل الحقيبة عملية", en: "What makes a bag practical" },
        body: {
          ar: "وزن الحقيبة وهي فارغة يُحسب من وزنك المسموح، فكلما كانت أخف بقي لك وزن أكثر لأغراضك. الحقيبة بأربع عجلات دوارة تمشي بجانبك بسهولة على الأرض الملساء، والحقيبة بعجلتين أثبت على الأرصفة والأرض غير المستوية. انتبه لجودة السحاب والمقبض الممتد، فهما أكثر ما يتعطل. ويفيدك جيب خارجي سريع، ولون أو علامة مميزة تعرف بها حقيبتك على سير الأمتعة.",
          en: "The empty weight counts against your allowance, so a lighter case leaves more for your things. Four spinner wheels glide beside you on smooth floors; two wheels are steadier on pavements and uneven ground. Check the zip and telescopic handle, the parts that fail most. A quick outer pocket and a distinctive colour or tag help on the baggage belt.",
        },
        checks: [
          { ar: "قارن الوزن الفارغ المكتوب على بطاقة الحقيبة.", en: "Compare the empty weight on the bag's label." },
          { ar: "جرّب المقبض والعجلات في المحل قبل الشراء.", en: "Try the handle and wheels in the shop before buying." },
          { ar: "ضع اسمك ورقم جوالك داخل الحقيبة وعلى بطاقة خارجية.", en: "Put your name and phone number inside the bag and on an outside tag." },
        ],
      },
      {
        heading: { ar: "مقاس حقيبة المقصورة ووزنها", en: "Cabin bag size and weight" },
        body: {
          ar: "كل شركة طيران تحدد مقاس حقيبة المقصورة ووزنها وعدد القطع، وتختلف الأرقام بين الشركات وبين درجات الحجز، وبعض التذاكر الاقتصادية الأرخص تسمح بقطعة شخصية صغيرة فقط. المقاس يشمل العجلات والمقابض. لذلك لا تعتمد على رقم عام أو على ما كُتب على الحقيبة بأنها «مناسبة للمقصورة»، وراجع صفحة الأمتعة في موقع شركتك قبل السفر، خاصة إذا كانت رحلتك على أكثر من شركة.",
          en: "Each airline sets its own cabin bag size, weight and piece count, and they differ between airlines and fare classes; some cheaper economy fares allow only a small personal item. Size includes wheels and handles. Do not rely on a general number or a “cabin size” label; check your airline's baggage page before you fly, especially on trips with more than one airline.",
        },
        checks: [
          { ar: "تحقق من مقاس ووزن المقصورة لكل شركة في رحلتك.", en: "Check cabin size and weight for every airline on your trip." },
          { ar: "قس حقيبتك مع العجلات والمقبض.", en: "Measure your bag including wheels and handle." },
        ],
      },
      {
        heading: { ar: "الحقيبة اليدوية الصغيرة: أي نوع", en: "The small personal bag: which kind" },
        body: {
          ar: "القطعة الشخصية تكون تحت المقعد الذي أمامك. حقيبة الظهر الصغيرة توزع الوزن وتترك يديك حرتين في المطار. حقيبة الكتف أو الحقيبة الصغيرة المتقاطعة أسرع في الوصول للجواز والجوال. اختر حقيبة بجيب مغلق للوثائق، وجيب للشاحن، ومكان لزجاجة ماء فارغة.",
          en: "The personal item goes under the seat in front of you. A small backpack spreads the weight and leaves your hands free. A shoulder or cross-body bag gets you to passport and phone faster. Choose one with a closed pocket for documents, a pocket for the charger, and room for an empty water bottle.",
        },
        checks: [],
      },
      {
        heading: { ar: "ما تحتاجه في حقيبتك اليدوية", en: "What you need in your carry-on" },
        body: {
          ar: "ضع في اليد كل ما لا تستطيع الاستغناء عنه إذا تأخرت حقيبتك المشحونة أو ضاعت. بطاريات الليثيوم الاحتياطية مثل الباور بانك تُحمل عادة في المقصورة وليس في الحقيبة المشحونة، والسوائل في المقصورة لها قيود حجم تختلف حسب المطار؛ راجع شركة الطيران والمطار.",
          en: "Keep in the cabin everything you cannot do without if your checked bag is late or lost. Spare lithium batteries such as power banks usually travel in the cabin, not in checked bags, and liquids in the cabin have volume limits that vary by airport; check with the airline and airport.",
        },
        checks: [
          { ar: "الجواز والهوية والتذاكر والحجوزات (ونسخ منها على الجوال).", en: "Passport, ID, tickets and bookings (with copies on your phone)." },
          { ar: "الأدوية اليومية مع الوصفة الطبية.", en: "Daily medicines with the prescription." },
          { ar: "الجوال والشاحن والباور بانك.", en: "Phone, charger and power bank." },
          { ar: "بطاقات الدفع وقليل من النقد.", en: "Payment cards and a little cash." },
          { ar: "تغيير ملابس لليلة واحدة وأدوات عناية بعبوات صغيرة.", en: "A change of clothes for one night and small toiletries." },
          { ar: "الأشياء الثمينة والهشة: النظارات والإلكترونيات والمجوهرات.", en: "Valuables and fragile items: glasses, electronics, jewellery." },
          { ar: "سترة خفيفة وسماعات وزجاجة ماء فارغة تعبئها بعد التفتيش.", en: "A light jacket, headphones, and an empty bottle to fill after security." },
        ],
      },
      {
        heading: { ar: "أخطاء شائعة", en: "Common mistakes" },
        body: {
          ar: "وضع الباور بانك أو الأدوية في الحقيبة المشحونة، وشراء حقيبة ثقيلة وهي فارغة، والاعتماد على وزن مسموح سمعته من رحلة سابقة أو من شركة أخرى، وحشو الحقيبة حتى آخر كيلو في رحلة الذهاب فلا يبقى مكان لمشتريات العودة.",
          en: "Packing the power bank or medicines in the checked bag, buying a case that is heavy when empty, relying on an allowance from a previous trip or another airline, and filling the case to the last kilo on the way out with no room for the trip home.",
        },
        checks: [],
      },
    ],
    sources: [
      { label: { ar: "الخطوط السعودية: معلومات الأمتعة في موقع الشركة", en: "Saudia: baggage information on the airline's site" }, href: SAUDIA },
      { label: { ar: "طيران ناس: معلومات الأمتعة في موقع الشركة", en: "flynas: baggage information on the airline's site" }, href: FLYNAS },
      { label: { ar: "الهيئة العامة للطيران المدني: حماية حقوق المسافرين", en: "GACA: Passenger Rights Protection Regulations" }, href: GACA_RIGHTS },
      { label: { ar: "مركز السفر التابع للاتحاد الدولي للنقل الجوي", en: "IATA Travel Centre" }, href: IATA_TRAVEL_CENTRE },
    ],
  },
  {
  slug: "turkey",
  stage: "destination",
  title: {
    ar: "دليل تركيا للمسافر السعودي",
    en: "Türkiye Guide for Saudi Travellers",
  },
  description: {
    ar: "كيف تختار مدن تركيا وموسمها، وكيف تتنقل داخل المدن وبينها، وما شروط الدخول لحامل الجواز السعودي، بمصادر رسمية.",
    en: "How to choose Türkiye's cities and season, how to get around within and between them, and the entry rules for Saudi passport holders, with official sources.",
  },
  reviewedAt: "2026-10-28",
  status: "draft",
  sections: [
    {
      heading: {
        ar: "لمن تناسب تركيا وما تقدمه",
        en: "Who Türkiye suits and what it offers",
      },
      body: {
        ar: "تجمع تركيا مدينة تاريخية كبرى وساحلًا متوسطيًا ومرتفعات مطيرة في بلد واحد، لذلك يتحدد الاختيار بنوع الرحلة لا باسم البلد. إسطنبول تخدم المعالم والأحياء والتسوق، وأنطاليا تخدم إقامة الساحل، وطرابزون قاعدة لرحلات الطبيعة في البحر الأسود، وكابادوكيا تجربة وديان وتكوينات صخرية. تضم قائمة التراث العالمي لليونسكو مواقع في تركيا، من بينها المناطق التاريخية في إسطنبول ومتنزه غوريمه الوطني ومواقع كابادوكيا الصخرية. حدد نوع الرحلة أولًا، ثم اختر مدينة أو مدينتين تخدمانه.",
        en: "Türkiye combines a major historic city, a Mediterranean coast and rainy highlands in one country, so the choice is set by the type of trip rather than by the name of the country. Istanbul serves monuments, neighbourhoods and shopping; Antalya serves a coastal stay; Trabzon is a base for nature trips on the Black Sea; and Cappadocia is an experience of valleys and rock formations. The UNESCO World Heritage List includes sites in Türkiye, among them the Historic Areas of Istanbul and Göreme National Park and the Rock Sites of Cappadocia. Decide the type of trip first, then choose one or two cities that serve it.",
      },
      checks: [
        {
          ar: "اكتب هدف الرحلة في سطر واحد قبل اختيار المدن.",
          en: "Write the purpose of the trip in one line before choosing cities.",
        },
        {
          ar: "اقتصر على محطتين في أول زيارة.",
          en: "Limit a first visit to two bases.",
        },
        {
          ar: "راجع قائمة اليونسكو إذا كان التاريخ أولويتك.",
          en: "Check the UNESCO list if history is your priority.",
        },
      ],
    },
    {
      heading: {
        ar: "متى تسافر وكم تبقى",
        en: "When to go and how long to stay",
      },
      body: {
        ar: "لا يوجد شهر واحد يناسب كل مناطق تركيا، لأن مناخ إسطنبول يختلف عن الساحل المتوسطي وعن ساحل البحر الأسود. تنشر الإدارة العامة للأرصاد الجوية التركية معدلات مناخية لكل محافظة، وهي معدلات تاريخية تصلح للمقارنة بين المناطق ولا تصلح توقعًا ليوم السفر. الصيف حار على ساحل أنطاليا، وساحل البحر الأسود يسجل مطرًا في معظم أشهر السنة، لذلك تحتاج رحلات المرتفعات خطة بديلة للمطر. أربع إلى خمس ليالٍ تكفي زيارة مركزة لمدينة واحدة، وسبع إلى تسع ليالٍ توزيع معقول لمحطتين، وهذه توصية تخطيطية لا مدة إلزامية.",
        en: "No single month suits every region of Türkiye, because Istanbul's climate differs from the Mediterranean coast and from the Black Sea coast. The Turkish State Meteorological Service publishes climate averages for each province; these are historical averages useful for comparing regions, not a forecast for your travel day. Summer is hot on the Antalya coast, and the Black Sea coast records rain in most months of the year, so highland trips need a rain alternative. Four to five nights is enough for a focused visit to one city, and seven to nine nights is a reasonable spread for two bases; this is a planning recommendation, not a required duration.",
      },
      checks: [
        {
          ar: "راجع معدلات المحافظة، ثم توقع المدينة قبل كل نشاط خارجي.",
          en: "Check the province averages, then the city forecast before each outdoor activity.",
        },
        {
          ar: "اترك يومًا مرنًا في برامج المرتفعات.",
          en: "Leave one flexible day in a highland itinerary.",
        },
        {
          ar: "قلل عدد المحطات بدل زيادة الأيام الانتقالية.",
          en: "Cut the number of bases instead of adding transfer days.",
        },
      ],
    },
    {
      heading: {
        ar: "التنقل داخل المدن",
        en: "Getting around within cities",
      },
      body: {
        ar: "تعتمد حركة إسطنبول على شبكة سكك وعبّارات: خطوط مترو مرقمة، منها M11 الذي يخدم مطار إسطنبول وM4 الذي يربط كاديكوي بمطار صبيحة كوكجن، وترام T1 على المحور التاريخي، وفونيكولار F1 بين تقسيم وكاباتاش، وقطار مرماراي الذي يعبر بين جانبي المدينة. تشغّل مترو إسطنبول خدمة ليلية على سبعة خطوط مترو في ليلتي الجمعة إلى السبت والسبت إلى الأحد، ولا تشمل هذه القاعدة تلقائيًا الترام أو الفونيكولار أو خط المطار. في أنطاليا يعرض المطار خدمة ترام AntRay نحو محور المدينة ومحطة الحافلات، إضافة إلى حافلات، وفي طرابزون تعرض الإدارة العامة للمطارات حافلات المطار والحافلات البلدية والميني باص والتاكسي والتأجير. ابدأ من عنوان الفندق وعدد الحقائب ووقت الوصول، لا من اسم المدينة.",
        en: "Istanbul's movement rests on a rail and ferry network: numbered metro lines, among them M11 serving Istanbul Airport and M4 linking Kadıköy with Sabiha Gökçen Airport, the T1 tram on the historic axis, the F1 funicular between Taksim and Kabataş, and the Marmaray train that crosses between the two sides of the city. Metro İstanbul runs a night service on seven metro lines on Friday-to-Saturday and Saturday-to-Sunday nights; this rule does not automatically cover the tram, the funicular or the airport line. In Antalya the airport lists AntRay tram service towards the city axis and the bus terminal, alongside buses, and in Trabzon the State Airports Authority lists airport buses, municipal buses, minibuses, taxis and car hire. Start from the hotel address, the number of bags and the arrival time, not from the name of the city.",
      },
      checks: [
        {
          ar: "افحص الخط والاتجاه والجزء الأخير إلى الفندق قبل الوصول.",
          en: "Check the line, the direction and the last leg to the hotel before you arrive.",
        },
        {
          ar: "لا تعتمد على الخدمة الليلية قبل التحقق من الخط والمدخل.",
          en: "Do not rely on the night service before confirming the line and the entrance.",
        },
        {
          ar: "أثبت سعة المركبة للحقائب ومقعد الطفل كتابة.",
          en: "Confirm vehicle luggage capacity and any child seat in writing.",
        },
      ],
    },
    {
      heading: {
        ar: "التنقل بين المدن",
        en: "Getting between cities",
      },
      body: {
        ar: "تربط شبكة القطارات التركية محورًا داخليًا يمر بإسطنبول وأنقرة ومدن أخرى، لكن أنطاليا وطرابزون ليستا على شبكة قطارات الركاب حتى الآن. لذلك يبقى الطيران الداخلي أو الحافلة بين المدن هو الخيار العملي لمسار يجمع الساحل أو البحر الأسود، ويُفحص لدى الناقل أو المشغل في تاريخ السفر. ابحث في موقع مشغل القطارات عن المسار والتاريخ بدل افتراض وجود قطار مباشر. احسب يوم الانتقال كاملًا من الغرفة إلى الغرفة، لا مدة الطيران وحدها.",
        en: "Türkiye's rail network links an inland axis through Istanbul, Ankara and other cities, but Antalya and Trabzon are not yet on the passenger rail network. Domestic flights or intercity buses therefore remain the practical option for an itinerary that includes the coast or the Black Sea, and they are checked with the carrier or operator on your travel date. Search the rail operator's site for the route and date instead of assuming a direct train exists. Count the whole transfer day from room to room, not the flight time alone.",
      },
      checks: [
        {
          ar: "ابحث عن المسار والتاريخ لدى مشغل القطارات قبل بناء الخطة عليه.",
          en: "Search the rail operator for the route and date before building a plan on it.",
        },
        {
          ar: "حدد مطار المغادرة ومطار الوصول قبل حجز الفندق.",
          en: "Fix the departure and arrival airports before booking the hotel.",
        },
        {
          ar: "اترك فاصلًا كافيًا بين تذكرتين منفصلتين لا يحميهما ربط واحد.",
          en: "Leave enough margin between two separate tickets that no single connection protects.",
        },
      ],
    },
    {
      heading: {
        ar: "أخطاء التخطيط الشائعة",
        en: "Common planning mistakes",
      },
      body: {
        ar: "الخطأ الأكثر تكرارًا هو حجز إسطنبول دون تحديد المطار، فالمدينة تخدمها بوابتان على جانبين مختلفين والانتقال بينهما رحلة مستقلة. الخطأ الثاني هو التعامل مع أنطاليا كنقطة واحدة، بينما يختلف المركز عن المناطق الساحلية الأبعد في زمن الوصول وطبيعة اليوم. الخطأ الثالث هو جمع أوزنجول وسوميلا وآيدر في يوم واحد؛ أوزنجول وسوميلا داخل نطاق محافظة طرابزون، وآيدر تتبع محافظة ريزه. الخطأ الرابع هو الاعتماد على معلومة تشغيلية قديمة عن خط أو موقع، لأن التنبيهات والجداول تتغير.",
        en: "The most frequent mistake is booking Istanbul without fixing the airport, since the city is served by two gateways on different sides and moving between them is a separate journey. The second is treating Antalya as a single point, when the centre differs from the farther coastal areas in travel time and in the shape of the day. The third is combining Uzungöl, Sümela and Ayder in one day; Uzungöl and Sümela lie within Trabzon province, while Ayder belongs to Rize province. The fourth is relying on an old operational note about a line or a site, because alerts and timetables change.",
      },
      checks: [
        {
          ar: "اكتب رمز مطار الوصول في كل حجز.",
          en: "Write the arrival airport code on every booking.",
        },
        {
          ar: "خصص لكل يوم اتجاهًا واحدًا.",
          en: "Give each day a single direction.",
        },
        {
          ar: "أعد فحص التنبيه التشغيلي قبل يوم النشاط.",
          en: "Re-check the operational alert before the day of the activity.",
        },
      ],
    },
    {
      heading: {
        ar: "شروط الدخول لحامل الجواز السعودي",
        en: "Entry requirements for Saudi passport holders",
      },
      body: {
        ar: "حامل الجواز السعودي العادي معفى من تأشيرة زيارة تركيا حتى 90 يومًا خلال أي 180 يومًا، بموجب قرار نُشر في الجريدة الرسمية التركية وتعرضه صفحة التأشيرات لدى وزارة الخارجية التركية. الحد تراكمي داخل نافذة متحركة، والإعفاء لا يمنح حق العمل أو الدراسة أو الإقامة الطويلة. ويشترط القانون رقم 6458 أن تمتد صلاحية وثيقة السفر 60 يومًا على الأقل بعد مدة الإقامة المسموح بها، وتوصي الوزارة بصورة منفصلة بجواز صالح ستة أشهر من تاريخ الوصول. المقيم في السعودية بجواز غير سعودي يتبع جنسية جوازه لا دولة إقامته، والشروط قابلة للتغير، فافحصها لدى وزارة الخارجية التركية قبل أي ترتيب غير مسترد.",
        en: "A holder of an ordinary Saudi passport is exempt from a visa for a visit to Türkiye for up to 90 days within any 180 days, under a decision published in the Turkish Official Gazette and shown on the Turkish Ministry of Foreign Affairs visa page. The limit is cumulative inside a rolling window, and the exemption does not grant the right to work, study or long-term residence. Turkish law 6458 further requires the travel document to remain valid for at least 60 days beyond the permitted duration of stay, and the Ministry separately advises a passport valid for six months from the date of arrival. A resident in Saudi Arabia holding a non-Saudi passport follows the nationality of that passport, not the country of residence; requirements can change, so check them with the Turkish Ministry of Foreign Affairs before any non-refundable arrangement.",
      },
      checks: [
        {
          ar: "افحص جواز كل مسافر على حدة قبل شراء التذاكر.",
          en: "Check each traveller's passport separately before buying tickets.",
        },
        {
          ar: "احسب رصيد 90/180 من دخولك السابق لا من تاريخ الرحلة.",
          en: "Count the 90/180 balance from your previous entry, not from the trip date.",
        },
        {
          ar: "راجع صفحة وزارة الخارجية التركية في تاريخ قريب من السفر.",
          en: "Re-read the Turkish Ministry of Foreign Affairs page close to your travel date.",
        },
      ],
    },
  ],
  sources: [
    {
      label: {
        ar: "وزارة الخارجية التركية: معلومات التأشيرة للأجانب",
        en: "Turkish Ministry of Foreign Affairs: visa information for foreigners",
      },
      href: "https://www.mfa.gov.tr/visa-information-for-foreigners.en.mfa",
    },
    {
      label: {
        ar: "وزارة الخارجية التركية: شروط صلاحية الجواز عند الدخول",
        en: "Turkish Ministry of Foreign Affairs: passport validity requirements on entry",
      },
      href: "https://www.mfa.gov.tr/passport-validity-requirements-while-entering-turkey-in-accordance-with-law-on-foreigners-and-international-protection.en.mfa",
    },
    {
      label: {
        ar: "مترو إسطنبول: المترو الليلي",
        en: "Metro İstanbul: night metro",
      },
      href: "https://metro.istanbul/en/content/Gece-Metrosu",
    },
    {
      label: {
        ar: "الإدارة العامة للأرصاد الجوية التركية: إحصاءات المحافظات",
        en: "Turkish State Meteorological Service: provincial statistics",
      },
      href: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=ISTANBUL",
    },
    {
      label: {
        ar: "مطار أنطاليا: الحافلات والنقل العام",
        en: "Antalya Airport: buses and public transport",
      },
      href: "https://www.antalya-airport.aero/yolcu-ve-ziyaretciler/ulasim/otobusler-ve-toplu-tasima",
    },
    {
      label: {
        ar: "الإدارة العامة للمطارات: الوصول إلى مطار طرابزون",
        en: "Turkish State Airports Authority: getting to Trabzon Airport",
      },
      href: "https://www.dhmi.gov.tr/Sayfalar/Havalimani/Trabzon/Ulasim.aspx",
    },
    {
      label: {
        ar: "مشغل القطارات التركي: بحث المسارات",
        en: "TCDD Taşımacılık: route search",
      },
      href: "https://www.tcddtasimacilik.gov.tr/",
    },
    {
      label: {
        ar: "اليونسكو: مواقع التراث العالمي في تركيا",
        en: "UNESCO: World Heritage sites in Türkiye",
      },
      href: "https://whc.unesco.org/en/statesparties/tr",
    },
  ],
},
  {
  slug: "georgia",
  stage: "destination",
  title: {
    ar: "دليل جورجيا للمسافر السعودي",
    en: "Georgia: a planning guide for Saudi travellers",
  },
  description: {
    ar: "تخطيط جورجيا بمعلومات محددة النطاق: لمن تناسب، الموسم والمدة، التنقل بين تبليسي والجبال والساحل، أخطاء التخطيط الشائعة، ومتطلبات الدخول لحامل الجواز السعودي.",
    en: "Planning Georgia with scoped information: who it suits, season and trip length, moving between Tbilisi, the mountains and the coast, common planning mistakes, and entry requirements for Saudi passport holders.",
  },
  reviewedAt: "2026-10-28",
  status: "draft",
  sections: [
    {
      heading: { ar: "لمن تناسب جورجيا", en: "Who Georgia suits" },
      body: {
        ar: "تناسب جورجيا من يريد مدينة قاعدة وجبالًا وساحلًا في بلد واحد، ويقبل التنقل البري بين مناطق متباعدة. تبليسي قاعدة عملية للمدينة وللرحلات القريبة، والشمال الجبلي حول ستيبانتسميندا وكازبيجي يُوصل برًا من تبليسي، وباتومي تضيف ساحل البحر الأسود. تضم جورجيا مواقع مدرجة على قائمة التراث العالمي لليونسكو، منها آثار متسخيتا وسفانيتي العليا ودير جيلاتي، وهي خيار مناسب إذا كان التاريخ محور الرحلة.",
        en: "Georgia suits a traveller who wants a city base, mountains and a coast in one country, and accepts road travel between regions that are far apart. Tbilisi works as a base for the city and nearby trips, the mountainous north around Stepantsminda and Kazbegi is reached by road from Tbilisi, and Batumi adds the Black Sea coast. Georgia has sites on the UNESCO World Heritage List, among them the historical monuments of Mtskheta, Upper Svaneti and Gelati Monastery, so it fits a trip built around history.",
      },
      checks: [
        { ar: "اختر مدينتين أو ثلاثًا بدل تغطية كل المناطق.", en: "Pick two or three bases instead of covering every region." },
        { ar: "حدد محور الرحلة — مدينة أم جبل أم ساحل — قبل اختيار القاعدة.", en: "Decide the trip's focus — city, mountain or coast — before choosing a base." },
      ],
    },
    {
      heading: { ar: "متى تذهب وكم تبقى", en: "When to go and how long" },
      body: {
        ar: "لا يوجد شهر مضمون للثلج أو للطقس الجبلي، والطرق الجبلية تخضع لقيود موسمية. تنشر إدارة الطرق الجورجية قيود الحركة على المقاطع الجبلية، وقد تُغلق مقاطع على مسار متسخيتا–ستيبانتسميندا–لارسي أو تُقصر على مركبات بمواصفات محددة في الطقس الصعب. اجعل في البرنامج يومًا مرنًا، واترك مسافة أمان في يوم العودة إلى المطار.",
        en: "No month is guaranteed for snow or for mountain weather, and mountain roads are subject to seasonal restrictions. The Roads Department of Georgia publishes traffic restrictions on mountain sections, and sections of the Mtskheta–Stepantsminda–Larsi route may be closed or limited to vehicles of a specified type in difficult weather. Keep one flexible day in the plan, and leave a margin on the day you return to the airport.",
      },
      checks: [
        { ar: "افحص قيود الطرق من إدارة الطرق قبل كل انتقال جبلي.", en: "Check road restrictions with the Roads Department before each mountain transfer." },
        { ar: "لا تضع نشاطًا جبليًا في اليوم الأخير قبل الطيران.", en: "Do not place a mountain activity on the last day before your flight." },
      ],
    },
    {
      heading: { ar: "التنقل والفروق بين المناطق", en: "Getting around and regional differences" },
      body: {
        ar: "الوصول إلى الشمال الجبلي يكون برًا من تبليسي، ووقت الطريق يتغير بحسب الطقس وحالة المقطع لا بحسب المسافة وحدها. تشغّل سكك الحديد الجورجية قطارات داخلية، منها مسار تبليسي–باتومي، والجدول والحجز من الموقع الرسمي للسكك. لا تبنِ البرنامج على جدول منقول من مقال أو لقطة قديمة؛ المسافات بين المناطق أطول مما تبدو على الخريطة.",
        en: "The mountainous north is reached by road from Tbilisi, and journey time changes with the weather and the state of the road section, not with distance alone. Georgian Railway runs domestic trains, including the Tbilisi–Batumi route, with the timetable and booking on the railway's official site. Do not build the plan on a timetable copied from an article or an old screenshot; distances between regions are longer than they look on a map.",
      },
      checks: [
        { ar: "طابق يوم الخدمة والمقاعد من موقع السكك الرسمي قبل تثبيت السكن.", en: "Match the service day and seat availability on the official railway site before fixing accommodation." },
        { ar: "اطلب ساعات السائق والطريق والمواقف وسياسة الإلغاء كتابةً.", en: "Get the driver's hours, route, stops and cancellation policy in writing." },
      ],
    },
    {
      heading: { ar: "أخطاء التخطيط الشائعة", en: "Common planning mistakes" },
      body: {
        ar: "أكثر الأخطاء هو ضغط تبليسي والجبال وباتومي في أسبوع واحد مع وصول ومغادرة من تبليسي، فتتحول الرحلة إلى انتقالات. الخطأ الثاني هو افتراض أن الطريق أو النشاط الجبلي مفتوح لأن الموسم موسم ثلج، دون فحص الحالة في التاريخ نفسه. الخطأ الثالث هو الاعتماد على معلومات دخول قديمة؛ القواعد تتغير وتُراجع من المصدر الرسمي قبل كل رحلة.",
        en: "The most common mistake is squeezing Tbilisi, the mountains and Batumi into one week with arrival and departure in Tbilisi, which turns the trip into a series of transfers. The second is assuming a road or a mountain activity is open because it is the snow season, without checking the status for that exact date. The third is relying on old entry information; the rules change and must be rechecked with the official source before each trip.",
      },
      checks: [
        { ar: "ثبّت قاعدة واحدة للجبال في الرحلة القصيرة.", en: "Fix a single mountain base on a short trip." },
        { ar: "أكّد تشغيل النشاط من المشغل في التاريخ المحدد.", en: "Confirm the activity is running with the operator for your exact date." },
      ],
    },
    {
      heading: { ar: "متطلبات الدخول لحامل الجواز السعودي", en: "Entry requirements for Saudi passport holders" },
      body: {
        ar: "تنظم قرارات الحكومة الجورجية الدخول دون تأشيرة بقوائم للدول ومددها، والحكم مرتبط بجنسية الجواز لا بمكان الإقامة. لم نتمكن من فتح نص القرار الرسمي للتأكد من مدة الإعفاء لحامل الجواز السعودي، والمصادر غير الرسمية تتعارض فيها، فلا نذكر مدة هنا: راجعها من القنصلية الجورجية قبل الحجز. المقيم في السعودية بجنسية أخرى يخضع لمسار منفصل: ينظم القرار رقم 256 دخول حاملي تأشيرة أو إقامة سارية من دول مدرجة حتى 90 يومًا ضمن أي 180 يومًا، بشرط سريان الوثيقة يوم الدخول، وتسري شروط أشد على مواطني عدد من الدول، تتعلق بتعدد الدخول وبمدة سريان الوثيقة. إدراج الدولة في القائمة لا يعني ضمان القبول على الحدود. هذه القواعد تتغير، فافحص نص القرار وصفحة التأشيرات في وزارة الخارجية الجورجية قبل إصدار التذاكر وقبل السفر.",
        en: "Georgian government ordinances set visa-free entry through lists of countries and their permitted stays, and this follows the nationality of the passport, not the country of residence. We could not open the official text to confirm the permitted stay for a Saudi passport, and unofficial sources disagree on it, so no duration is stated here: check it with the Georgian consular service before booking. A resident of Saudi Arabia holding another nationality falls under a separate track: Ordinance No. 256 allows holders of a valid visa or residence permit from listed countries to stay up to 90 days within any 180 days, provided the document is valid on the day of entry, and stricter conditions on multiple entry and document validity apply to citizens of a number of countries. Being on the list does not guarantee admission at the border. These rules change, so check the text of the ordinance and the visa page of the Georgian Ministry of Foreign Affairs before issuing tickets and before travel.",
      },
      checks: [
        { ar: "حدد جنسية الجواز المستخدم لكل مسافر قبل أي حجز.", en: "Establish the nationality of the passport each traveller will use before any booking." },
        { ar: "عند الاعتماد على إقامة أو تأشيرة داعمة، تأكد من سريانها يوم الدخول.", en: "If relying on a supporting residence permit or visa, confirm it is valid on the day of entry." },
        { ar: "أعد فحص قواعد الدخول من المصدر الرسمي قبل السفر.", en: "Recheck the entry rules with the official source before travel." },
      ],
    },
  ],
  sources: [
    {
      label: {
        ar: "الجريدة التشريعية الجورجية: قرار الحكومة رقم 255 (قائمة الدخول دون تأشيرة)",
        en: "Legislative Herald of Georgia: Government Ordinance No. 255 (visa-free list)",
      },
      href: "https://matsne.gov.ge/en/document/view/2867361",
    },
    {
      label: {
        ar: "الجريدة التشريعية الجورجية: قرار الحكومة رقم 256 (حاملو تأشيرة أو إقامة من دول مدرجة)",
        en: "Legislative Herald of Georgia: Government Ordinance No. 256 (holders of a visa or residence permit from listed countries)",
      },
      href: "https://matsne.gov.ge/en/document/view/2867377",
    },
    {
      label: {
        ar: "وزارة الخارجية الجورجية: معلومات التأشيرة",
        en: "Ministry of Foreign Affairs of Georgia: visa information",
      },
      href: "https://uae.mfa.gov.ge/visa-information",
    },
    {
      label: {
        ar: "اليونسكو: مواقع التراث العالمي في جورجيا",
        en: "UNESCO: World Heritage properties in Georgia",
      },
      href: "https://whc.unesco.org/en/statesparties/ge",
    },
    {
      label: {
        ar: "إدارة الطرق في جورجيا: قيود الحركة وحالة الطرق",
        en: "Roads Department of Georgia: traffic restrictions and road conditions",
      },
      href: "https://georoad.ge/",
    },
    {
      label: {
        ar: "سكك الحديد الجورجية: الجدول والحجز الرسمي",
        en: "Georgian Railway: official timetable and booking",
      },
      href: "https://ticket.railway.ge/",
    },
    {
      label: {
        ar: "الإدارة الوطنية للسياحة في جورجيا: معلومات المناطق",
        en: "Georgian National Tourism Administration: regional information",
      },
      href: "https://georgia.travel/",
    },
  ],
},
  {
  slug: "azerbaijan",
  stage: "destination",
  title: {
    ar: "دليل أذربيجان للمسافر السعودي",
    en: "Azerbaijan: a planning guide for Saudi travellers",
  },
  description: {
    ar: "تخطيط أذربيجان بمعلومات محددة النطاق: لمن تناسب، الموسم والمدة، التنقل بين باكو والجبال وشيكي، أخطاء التخطيط الشائعة، ومتطلبات الدخول لحامل الجواز السعودي.",
    en: "Planning Azerbaijan with scoped information: who it suits, season and trip length, moving between Baku, the mountains and Sheki, common planning mistakes, and entry requirements for Saudi passport holders.",
  },
  reviewedAt: "2026-10-28",
  status: "reviewed",
  sections: [
    {
      heading: { ar: "لمن تناسب أذربيجان", en: "Who Azerbaijan suits" },
      body: {
        ar: "تناسب أذربيجان من يريد مدينة حديثة ومركزًا تاريخيًا مع خيار جبلي في رحلة قصيرة، ويقبل التنقل البري بين قواعد منفصلة. باكو هي قاعدة المدينة، ومركزها التاريخي إيتشري شهر مدرج على قائمة التراث العالمي لليونسكو مع قصر الشروانشاهات وبرج العذراء. وشيكي مدينة تاريخية بقصر الخان، تحتاج وقتًا مستقلًا لا طرفًا في يوم طويل. قبالا ومنطقة قوسار الجبلية تضيفان الطبيعة والأنشطة الموسمية.",
        en: "Azerbaijan suits a traveller who wants a modern city and a historic centre with a mountain option on a short trip, and accepts road travel between separate bases. Baku is the city base, and its historic centre, Icherisheher, is on the UNESCO World Heritage List together with the Shirvanshahs' Palace and the Maiden Tower. Sheki is a historic town with the Khan's Palace; it needs time of its own rather than a corner of a long day. Gabala and the mountainous Qusar area add nature and seasonal activities.",
      },
      checks: [
        { ar: "اختر قاعدة جبلية واحدة في الرحلة القصيرة.", en: "Choose a single mountain base on a short trip." },
        { ar: "خصص لشيكي يومًا مستقلًا إذا كان التاريخ محور الرحلة.", en: "Give Sheki its own day if history is the focus of the trip." },
      ],
    },
    {
      heading: { ar: "متى تذهب وكم تبقى", en: "When to go and how long" },
      body: {
        ar: "لا تُوصف أي فترة بأنها مضمونة للثلج أو للطقس الجبلي؛ الأنشطة الجبلية تختلف بين الصيف والشتاء وتتوقف بحسب الحالة اليومية. أسبوع واحد يكفي لباكو وقاعدة جبلية واحدة، وإدخال شيكي يحتاج أيامًا إضافية بدل ضغطها في ذهاب وعودة طويل. اترك يومًا مرنًا للطقس، ولا تثبّت نشاطًا جبليًا في يوم المغادرة.",
        en: "No period is described as guaranteed for snow or for mountain weather; mountain activities differ between summer and winter and stop according to daily conditions. One week is enough for Baku and a single mountain base, while adding Sheki needs extra days rather than a long there-and-back day. Leave one flexible day for weather, and do not fix a mountain activity on the departure day.",
      },
      checks: [
        { ar: "افحص حالة التشغيل والطقس في يوم الزيارة لا قبل أسابيع.", en: "Check operating status and weather on the day of the visit, not weeks ahead." },
        { ar: "راجع حدود العمر والطول والوزن والتأمين لكل نشاط جبلي.", en: "Review age, height, weight and insurance limits for each mountain activity." },
      ],
    },
    {
      heading: { ar: "التنقل والفروق بين المناطق", en: "Getting around and regional differences" },
      body: {
        ar: "ينشر مطار حيدر علييف في باكو خيارات النقل الرسمية من المطار على موقعه؛ استخدم نقطة الالتقاء الرسمية وتحقق من الخيار المتاح وقت الوصول. تنشر سكك حديد أذربيجان جدول القطارات على موقعها الرسمي، وقد تغيّرت ترتيبات الوصول إلى قبالا أكثر من مرة، فطابق يوم الخدمة والمحطة والمقاعد قبل بناء البرنامج على القطار. الانتقال بين باكو والجبال بري في معظمه، ووقت الطريق يتأثر بالطقس وحالة المقطع.",
        en: "Heydar Aliyev Airport in Baku publishes its official airport transport options on its own site; use the official meeting point and check which option is available on arrival. Azerbaijan Railways publishes the train timetable on its official site, and the arrangements for reaching Gabala have changed more than once, so match the service day, the station and seat availability before building the plan around a train. Travel between Baku and the mountains is mostly by road, and journey time is affected by weather and the state of the road section.",
      },
      checks: [
        { ar: "طابق الجدول من موقع السكك الرسمي لا من مقال أو لقطة قديمة.", en: "Match the timetable on the official railway site, not from an article or an old screenshot." },
        { ar: "اطلب اسم الشركة والمركبة وساعات السائق والطريق وسياسة الإلغاء كتابةً.", en: "Get the company, the vehicle, the driver's hours, the route and the cancellation policy in writing." },
        { ar: "خطط الانتقال الجبلي في ضوء النهار.", en: "Plan mountain transfers in daylight." },
      ],
    },
    {
      heading: { ar: "أخطاء التخطيط الشائعة", en: "Common planning mistakes" },
      body: {
        ar: "الخطأ الأول هو ضغط باكو وقبالا وقوسار وشيكي في أسبوع واحد، فتصبح الرحلة انتقالات لا زيارات. الخطأ الثاني هو افتراض أن فتح منطقة جبلية يعني أن كل مصعد أو مسار أو نشاط يعمل. الخطأ الثالث هو إهمال تسجيل الإقامة في الرحلات الطويلة، والرابع هو إدخال مناطق مقيدة أو حدودية في المسار دون التحقق من أن زيارتها مسموحة عبر القنوات الرسمية.",
        en: "The first mistake is squeezing Baku, Gabala, Qusar and Sheki into one week, so the trip becomes transfers rather than visits. The second is assuming that an open mountain area means every lift, trail or activity is running. The third is neglecting stay registration on longer trips, and the fourth is putting restricted or border areas into the route without confirming through official channels that visiting them is permitted.",
      },
      checks: [
        { ar: "ثبّت ثلاث قواعد كحد أقصى في رحلة أسبوع.", en: "Keep to a maximum of three bases on a one-week trip." },
        { ar: "تحقق من أن كل منطقة في المسار مسموح زيارتها رسميًا.", en: "Confirm that every area in the route is officially open to visitors." },
      ],
    },
    {
      heading: { ar: "متطلبات الدخول لحامل الجواز السعودي", en: "Entry requirements for Saudi passport holders" },
      body: {
        ar: "تعلن دائرة الهجرة الحكومية إعفاء حاملي الجواز السعودي العادي من التأشيرة في الفترة من 15 فبراير 2026 إلى 15 فبراير 2027، بثلاث دخولات خلال الفترة وبحد أقصى 30 يومًا لكل دخول، والإعفاء لا يغطي ما تجاوز ذلك: دخولًا إضافيًا أو إقامة أطول أو غرضًا غير السياحة، فلكلٍّ منها مسار تأشيرة. هذا إعفاء مؤقت ومرتبط بجنسية الجواز، فالمقيم في السعودية بجنسية أخرى لا يأخذ حكم المواطن السعودي ويراجع مساره الخاص لدى دائرة الهجرة قبل السفر. من يقيم مؤقتًا أكثر من 15 يومًا يجب تسجيله في مكان الإقامة، ومهلة التقديم وردت بصور مختلفة في المواد الرسمية، فتُؤكد مع دائرة الهجرة ومع مكان الإقامة. القواعد تتغير، ولا يُفترض استمرار الإعفاء بعد 15 فبراير 2027 دون نشر رسمي؛ افحص البوابة الرسمية قبل إصدار التذاكر وقبل السفر.",
        en: "The State Migration Service announces a visa exemption for holders of ordinary Saudi passports in the period from 15 February 2026 to 15 February 2027, with three entries during that period and a maximum of 30 days per entry; the exemption does not cover more than that: a further entry, a longer stay, or a purpose other than tourism each need a visa. This is a temporary exemption tied to the nationality of the passport, so a resident of Saudi Arabia holding another nationality is not treated as a Saudi citizen and should check their own route with the State Migration Service before travelling. A foreigner staying temporarily for more than 15 days must be registered at the place of stay; the filing deadline has appeared differently in official material, so confirm it with the State Migration Service and with the place of stay. The rules change, and continuation of the exemption after 15 February 2027 must not be assumed without an official publication; check the official portal before issuing tickets and before travel.",
      },
      checks: [
        { ar: "احسب عدد الدخولات المستخدمة لكل جواز قبل الحجز.", en: "Count the entries already used on each passport before booking." },
        { ar: "اتفق كتابةً على من ينفذ التسجيل عند الإقامة أكثر من 15 يومًا.", en: "Agree in writing who files the registration for a stay longer than 15 days." },
        { ar: "أعد فحص الإعفاء وتاريخ انتهائه من المصدر الرسمي قبل إصدار التذاكر.", en: "Recheck the exemption and its end date with the official source before issuing tickets." },
      ],
    },
  ],
  sources: [
    {
      label: {
        ar: "دائرة الهجرة الحكومية: إعفاء حاملي الجواز السعودي العادي من التأشيرة",
        en: "State Migration Service: visa exemption for holders of ordinary Saudi passports",
      },
      href: "https://migration.gov.az/en/news_detail/16753",
    },
    {
      label: {
        ar: "البوابة الحكومية للتأشيرة الإلكترونية: متطلبات الدخول بحسب الدولة",
        en: "Official e-visa portal: entry requirements by country",
      },
      href: "https://www.evisa.gov.az/ar/countries",
    },
    {
      label: {
        ar: "وزارة الخارجية الأذربيجانية: التسجيل في مكان الإقامة",
        en: "Ministry of Foreign Affairs of Azerbaijan: registration at the place of stay",
      },
      href: "https://astana.mfa.gov.az/en/content/50/azerbaycan-respublikasina-gelen-ecnebilerin-ve-vetendasligi-olmayan-sexslerin-oldugu-yer-uzre-qeydiyyati",
    },
    {
      label: {
        ar: "اليونسكو: المدينة المسوّرة في باكو مع قصر الشروانشاهات وبرج العذراء",
        en: "UNESCO: Walled City of Baku with the Shirvanshah's Palace and Maiden Tower",
      },
      href: "https://whc.unesco.org/en/list/958",
    },
    {
      label: {
        ar: "اليونسكو: المركز التاريخي لشيكي مع قصر الخان",
        en: "UNESCO: Historic Centre of Sheki with the Khan's Palace",
      },
      href: "https://whc.unesco.org/en/list/1549",
    },
    {
      label: {
        ar: "مطار حيدر علييف الدولي: خيارات النقل الرسمية",
        en: "Heydar Aliyev International Airport: official transport options",
      },
      href: "https://www.airport.az/en/transport/",
    },
    {
      label: {
        ar: "سكك حديد أذربيجان: جدول القطارات الرسمي",
        en: "Azerbaijan Railways: official train timetable",
      },
      href: "https://ticket.ady.az/en/schedule-of-trains-new",
    },
    {
      label: {
        ar: "هيئة السياحة الأذربيجانية: معلومات المناطق والمعلومات العملية",
        en: "Azerbaijan Tourism Board: regional and practical information",
      },
      href: "https://azerbaijan.travel/",
    },
  ],
},
  {
  slug: "thailand",
  stage: "destination",
  title: {
    ar: "دليل تايلاند للمسافر السعودي",
    en: "Thailand: A Guide for Saudi Travelers",
  },
  description: {
    ar: "كيف تختار مناطق تايلاند، ومتى تسافر وكم مدة الرحلة، وكيف يشكّل التنقل الداخلي مسارك، وما يلزم حامل الجواز السعودي عند الدخول.",
    en: "How to choose between Thailand's regions, when to go and for how long, how domestic travel shapes the itinerary, and what Saudi passport holders need at entry.",
  },
  reviewedAt: "2026-10-28",
  status: "reviewed",
  sections: [
    {
      heading: {
        ar: "لمن تناسب تايلاند وكيف تختلف مناطقها",
        en: "Who Thailand suits and how its regions differ",
      },
      body: {
        ar: "تايلاند تناسب المسافر الذي يقبل مدينة واحدة كبيرة مع منطقة ثانية مختلفة في طابعها. بانكوك قاعدة حضرية للمطاعم والتسوق والتنقل العام، وشيانغ ماي في الشمال أهدأ وتميل إلى المعابد والأسواق والجبال. أما الشواطئ فهي عالمان منفصلان: ساحل أندامان غربًا حيث بوكيت وكرابي، وخليج تايلاند شرقًا حيث كوه ساموي. المنطقة التي تختارها تحدد الطقس والنقل وشكل اليوم أكثر مما يحدده اسم البلد.",
        en: "Thailand suits a traveler who accepts one large city plus a second region of a different character. Bangkok is an urban base for food, shopping and public transport, while Chiang Mai in the north is quieter and leans toward temples, markets and mountains. The beaches are two separate worlds: the Andaman coast in the west, where Phuket and Krabi sit, and the Gulf of Thailand in the east, where Koh Samui sits. The region you pick determines the weather, the transport and the shape of your day more than the name of the country does.",
      },
      checks: [
        {
          ar: "حدد قاعدتين فقط في رحلة من أسبوع.",
          en: "Pick only two bases for a one-week trip.",
        },
        {
          ar: "اقرأ المنطقة لا اسم المدينة قبل اختيار موقع الإقامة.",
          en: "Read the district, not the city name, before choosing where to stay.",
        },
        {
          ar: "لا تجمع ساحل أندامان وخليج تايلاند في برنامج قصير.",
          en: "Do not combine the Andaman coast and the Gulf of Thailand in a short itinerary.",
        },
      ],
    },
    {
      heading: {
        ar: "متى تسافر وكم مدة الرحلة",
        en: "When to go and how long to stay",
      },
      body: {
        ar: "لا يوجد شهر واحد يصلح لكل تايلاند، لأن أنماط المطر تختلف بين الشمال وبانكوك وساحل أندامان وخليج تايلاند. يبين الإرشاد الموسمي الرسمي لشواطئ البلاد أن الساحلين لا يتبعان التوقيت نفسه، لذلك يُختار الساحل بحسب تاريخ السفر لا العكس. سبع إلى تسع ليالٍ تكفي لبانكوك مع وجهة واحدة إضافية، وإضافة مدينة ثالثة تحتاج عشر ليالٍ أو أكثر. الإرشاد الموسمي تصنيف مناخي عام ولا يثبت حالة الجو أو البحر في تاريخ محدد.",
        en: "No single month works for all of Thailand, because rainfall patterns differ between the north, Bangkok, the Andaman coast and the Gulf of Thailand. Official seasonal guidance for the country's beaches shows that the two coasts do not follow the same timing, so the coast is chosen to fit the travel date rather than the reverse. Seven to nine nights are enough for Bangkok plus one additional destination, and adding a third city needs ten nights or more. Seasonal guidance is a general climate classification and does not establish the weather or sea state on a specific date.",
      },
      checks: [
        {
          ar: "اختر الساحل بعد تثبيت التاريخ، لا قبله.",
          en: "Choose the coast after fixing the date, not before.",
        },
        {
          ar: "أضف يومًا مرنًا إذا كان البحر عنصرًا أساسيًا في الرحلة.",
          en: "Add one flexible day if the sea is central to the trip.",
        },
      ],
    },
    {
      heading: {
        ar: "التنقل بين المدن والجزر وأثره على المسار",
        en: "Moving between cities and islands, and how that shapes the itinerary",
      },
      body: {
        ar: "المسافات بين بانكوك والشمال والجزر تُقطع عادة بالطيران الداخلي، ثم تحتاج الجزر انتقالًا بريًا وبحريًا بعده. مدة العبّارة أو القارب تتغير بحسب الميناء والمشغل وحالة البحر، ولا تُستنسخ من برنامج سابق. إذا كانت التذاكر الدولية والداخلية على حجوزات منفصلة فلا تفترض حماية تلقائية عند فوات الربط. كل انتقال إضافي يستهلك نصف يوم على الأقل، وهذا ما يجعل كثرة المناطق تقلّص الرحلة بدل أن توسعها.",
        en: "Distances between Bangkok, the north and the islands are usually covered by domestic flights, after which the islands still need a road transfer and a sea crossing. Ferry and boat durations change with the port, the operator and the sea state, and cannot be copied from an earlier itinerary. If the international and domestic tickets sit on separate bookings, do not assume automatic protection when a connection is missed. Every extra transfer consumes at least half a day, which is why adding regions shrinks a trip instead of expanding it.",
      },
      checks: [
        {
          ar: "اترك هامشًا واسعًا بين التذاكر المنفصلة.",
          en: "Leave a wide margin between separate tickets.",
        },
        {
          ar: "لا تضع انتقالًا بحريًا في يوم الوصول أو المغادرة الدولية.",
          en: "Do not place a sea crossing on the day of international arrival or departure.",
        },
        {
          ar: "اسأل مشغل القارب عن سياسة الطقس والإلغاء قبل الحجز.",
          en: "Ask the boat operator about its weather and cancellation policy before booking.",
        },
      ],
    },
    {
      heading: {
        ar: "أخطاء التخطيط",
        en: "Planning mistakes",
      },
      body: {
        ar: "أكثر الأخطاء شيوعًا جمع بانكوك وشيانغ ماي وبوكيت وكرابي وساموي في رحلة قصيرة. الخطأ الثاني الاعتماد على معلومة دخول قديمة، فنظام الإعفاء التايلاندي تغيّر في سبتمبر 2026 وأي صفحة أقدم من ذلك قد تكون مضللة. الخطأ الثالث الدفع لموقع وسيط مقابل بطاقة الوصول الرقمية، وهي مجانية على نطاق الهجرة الرسمي. الخطأ الرابع وصف مطعم أو نشاط بأنه مناسب دون تحقق مباشر من الفرع أو المشغل.",
        en: "The most common mistake is combining Bangkok, Chiang Mai, Phuket, Krabi and Samui in a short trip. The second is relying on outdated entry information: Thailand's exemption scheme changed in September 2026, and any page older than that may mislead. The third is paying an intermediary site for the digital arrival card, which is free on the official immigration domain. The fourth is calling a restaurant or an activity suitable without checking directly with the branch or the operator.",
      },
      checks: [
        {
          ar: "تحقق من تاريخ نشر أي صفحة تقرأ فيها قواعد الدخول.",
          en: "Check the publication date of any page you read entry rules on.",
        },
        {
          ar: "استخدم النطاق الحكومي فقط لأي نموذج دخول.",
          en: "Use only the government domain for any entry form.",
        },
      ],
    },
    {
      heading: {
        ar: "متطلبات الدخول لحاملي الجواز السعودي",
        en: "Entry requirements for Saudi passport holders",
      },
      body: {
        ar: "تذكر الجهات التايلاندية الرسمية أن الجواز السعودي العادي ضمن نظام الإعفاء السياحي لمدة لا تتجاوز 30 يومًا، الساري من 15 سبتمبر 2026 بعد إلغاء نظام 60 يومًا السابق، والقائمة النهائية هي المنشورة في الجريدة الرسمية. الإعفاء للسياحة فقط، والعمل أو الدراسة أو الأغراض الأخرى تحتاج فئة تأشيرة مستقلة، والمقيم في السعودية بجنسية أخرى يخضع لحكم جنسية جوازه. يلزم كذلك تعبئة بطاقة الوصول الرقمية TDAC قبل الوصول عبر نطاق الهجرة الرسمي، وهي مجانية وليست تأشيرة. القرار النهائي لضابط الهجرة، والقواعد تتغير، فافحص المصدر الرسمي قبل كل سفر.",
        en: "Thai official bodies state that the ordinary Saudi passport is within the tourist visa exemption scheme for stays of up to 30 days, in force since 15 September 2026 after the earlier 60-day scheme was withdrawn; the list published in the Royal Gazette is the authority. The exemption covers tourism only; work, study and other purposes need their own visa category, and a resident of Saudi Arabia holding another nationality is governed by the nationality in their passport. The Thailand Digital Arrival Card must also be completed before arrival on the official immigration domain; it is free and it is not a visa. The final decision rests with the immigration officer, and the rules change, so check the official source before every trip.",
      },
      checks: [
        {
          ar: "تحقق من إدراج الجواز السعودي في القائمة الرسمية قبل الحجز.",
          en: "Confirm the Saudi passport is on the official list before booking.",
        },
        {
          ar: "عبّئ بطاقة الوصول الرقمية من نطاق الهجرة الرسمي لكل دخول.",
          en: "Complete the digital arrival card on the official immigration domain for each entry.",
        },
        {
          ar: "افحص متطلبات شركة الطيران ودولة الترانزيت بصورة منفصلة.",
          en: "Check airline and transit-country requirements separately.",
        },
      ],
    },
  ],
  sources: [
    {
      label: {
        ar: "وزارة الخارجية التايلاندية: إحاطة تغيير نظام الإعفاء من التأشيرة",
        en: "Thai Ministry of Foreign Affairs: briefing on the revised visa exemption scheme",
      },
      href: "https://www.mfa.go.th/en/content/pb-summary-03092026-en",
    },
    {
      label: {
        ar: "هيئة السياحة التايلاندية: قواعد الإعفاء 30 و15 يومًا",
        en: "Tourism Authority of Thailand: the new 30-day and 15-day exemption rules",
      },
      href: "https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/",
    },
    {
      label: {
        ar: "مكتب الهجرة التايلاندي: بطاقة الوصول الرقمية والأسئلة الشائعة",
        en: "Thai Immigration Bureau: Digital Arrival Card FAQ",
      },
      href: "https://tdac.immigration.go.th/manual/en/faq.html",
    },
    {
      label: {
        ar: "هيئة السياحة التايلاندية: مواسم الشواطئ والجزر",
        en: "Tourism Authority of Thailand: seasons on the beaches and islands",
      },
      href: "https://www.tatnews.org/2024/02/the-best-time-to-visit-thailands-beaches-and-islands/",
    },
    {
      label: {
        ar: "البوابة الحكومية التايلاندية: أفضل وقت لزيارة الشواطئ",
        en: "Thai government portal: best time to visit the beaches",
      },
      href: "https://thailand.go.th/guide-book-detail/--413",
    },
  ],
},
  {
  slug: "bali",
  stage: "destination",
  title: {
    ar: "دليل بالي للمسافر السعودي",
    en: "Bali: A Guide for Saudi Travelers",
  },
  description: {
    ar: "كيف تختلف مناطق بالي، ومتى تسافر وكم مدة الرحلة، وكيف يشكّل التنقل والقوارب مسارك، وما يلزم حامل الجواز السعودي عند الدخول إلى إندونيسيا.",
    en: "How Bali's regions differ, when to go and for how long, how road and boat transfers shape the itinerary, and what Saudi passport holders need to enter Indonesia.",
  },
  reviewedAt: "2026-10-28",
  status: "reviewed",
  sections: [
    {
      heading: {
        ar: "لمن تناسب بالي وكيف تختلف مناطقها",
        en: "Who Bali suits and how its regions differ",
      },
      body: {
        ar: "بالي جزيرة واحدة، لكن مناطقها تختلف في الطابع وسهولة الوصول. أوبود قاعدة داخلية بين المرتفعات والطبيعة والأنشطة الثقافية، وليست منطقة شاطئية. نوسا دوا أقرب إلى وتيرة المنتجعات الهادئة، وسيمينياك أكثر حركة ومطاعم ومتاجر، وألواتو منطقة منحدرات وإطلالات يصعب فيها الوصول إلى بعض الشواطئ. اختيار المنطقة يسبق اختيار السكن، لأن موقع المبنى داخل المنطقة يغيّر زمن الطريق أكثر من المسافة على الخريطة.",
        en: "Bali is a single island, but its regions differ in character and in ease of access. Ubud is an inland base among the highlands, nature and cultural activities, and it is not a beach area. Nusa Dua runs at a quieter resort pace, Seminyak is busier with restaurants and shops, and Uluwatu is a clifftop area where some beaches are hard to reach. Choosing the region comes before choosing the accommodation, because a building's position inside a region changes travel time more than map distance does.",
      },
      checks: [
        {
          ar: "حدد المنطقة قبل مقارنة أماكن الإقامة.",
          en: "Settle the region before comparing places to stay.",
        },
        {
          ar: "افحص الدرج وانحدار الطريق إذا كان معك رضيع أو كبير سن.",
          en: "Check stairs and steep access if you travel with an infant or an older adult.",
        },
      ],
    },
    {
      heading: {
        ar: "متى تسافر وكم مدة الرحلة",
        en: "When to go and how long to stay",
      },
      body: {
        ar: "تتعامل هيئة الأرصاد الإندونيسية مع موسم المطر وموسم الجفاف كتصنيفين مناخيين، وتحدد بداية كل موسم لكل منطقة مناخية على حدة مقارنةً بالمعدل، وقد تتقدم البداية أو تتأخر عنه. لذلك لا يصح الوعد بشهر جاف مضمون أو ببحر هادئ في تاريخ بعينه. سبع إلى تسع ليالٍ تسمح بمنطقتين دون ضغط، والرحلة الأقصر تعمل بصورة أفضل من قاعدة واحدة مع جولات منتقاة. افحص النشرة القصيرة قبل الحجز ثم مرة أخرى قبل تنفيذ أي نشاط بحري.",
        en: "Indonesia's meteorological agency treats the rainy and dry seasons as climate classifications, sets each season's onset per climate zone against its long-term average, and notes that the onset can arrive earlier or later than that average. A guaranteed dry month or a calm sea on a given date therefore cannot be promised. Seven to nine nights allow two regions without pressure, and a shorter trip works better from a single base with selected day trips. Check the short-range forecast before booking, and again before carrying out any activity at sea.",
      },
      checks: [
        {
          ar: "لا تبنِ القرار على متوسط موسمي وحده.",
          en: "Do not decide on a seasonal average alone.",
        },
        {
          ar: "اجعل يوم الوصول خفيفًا.",
          en: "Keep the arrival day light.",
        },
      ],
    },
    {
      heading: {
        ar: "التنقل بين المناطق والجزر وأثره على المسار",
        en: "Moving between regions and islands, and how that shapes the itinerary",
      },
      body: {
        ar: "لا توجد مدة ثابتة بين المطار وأوبود أو بين مناطق بالي، لأن الازدحام ونقطة الإقامة يغيّران النتيجة. الانتقال إلى نوسا بينيدا والجزر المجاورة يتم بقوارب من مرافئ محددة، وتشغيلها يتأثر بحالة البحر وقد يُعلّق في الأحوال الشديدة. كل تبديل سكن يستهلك وقت تسجيل الدخول والخروج وانتقالًا بريًا، لذلك قاعدتان أفضل من ثلاث في أسبوع واحد. للنقل الخاص، ثبّت نوع المركبة وعدد الحقائب وساعات الخدمة قبل الاتفاق.",
        en: "There is no fixed duration between the airport and Ubud, or between Bali's regions, because traffic and the exact location of your accommodation change the result. Transfers to Nusa Penida and the neighboring islands run by boat from specific harbours, and their operation depends on the sea state and can be suspended in severe conditions. Every change of accommodation costs check-in and check-out time plus a road transfer, so two bases beat three in a single week. For private transport, fix the vehicle type, the luggage capacity and the service hours before agreeing.",
      },
      checks: [
        {
          ar: "ثبّت اسم المشغل ونقطة الانطلاق وسياسة الإلغاء بسبب الطقس.",
          en: "Fix the operator's name, the departure point and the weather cancellation policy.",
        },
        {
          ar: "لا تربط رحلة قارب غير قابلة للاسترداد بيوم الطيران الدولي.",
          en: "Do not tie a non-refundable boat trip to the day of an international flight.",
        },
      ],
    },
    {
      heading: {
        ar: "أخطاء التخطيط",
        en: "Planning mistakes",
      },
      body: {
        ar: "الخطأ الأول اختيار سكن بعيد من الصور دون فحص موقعه وطريق الوصول إليه. الخطأ الثاني الخلط بين إجراءات الدخول الثلاثة: التأشيرة، وتصريح الوصول الرقمي، ورسم السياح الأجانب في بالي؛ لكل إجراء جهة ونطاق مختلف، ولا يغني أحدها عن الآخر. الخطأ الثالث الدفع لموقع وسيط يشبه النطاق الحكومي أو يبيع نموذجًا مجانيًا. الخطأ الرابع افتراض الإعفاء من رسم بالي بناءً على وصف الرحلة، بينما قائمة الإعفاء وطريقة إثباته منشورتان على البوابة الرسمية.",
        en: "The first mistake is choosing a remote property from photographs without checking its location and the road to it. The second is confusing the three entry steps: the visa, the digital arrival declaration, and Bali's foreign tourist levy; each has a different authority and domain, and none replaces another. The third is paying an intermediary site that resembles the government domain or sells a free form. The fourth is assuming exemption from the Bali levy because of how the trip is described, when the exemption list and how to prove it are published on the official portal.",
      },
      checks: [
        {
          ar: "تعامل مع التأشيرة وتصريح الوصول والرسم كثلاثة إجراءات منفصلة.",
          en: "Treat the visa, the arrival declaration and the levy as three separate steps.",
        },
        {
          ar: "استخدم النطاقات الحكومية فقط.",
          en: "Use government domains only.",
        },
      ],
    },
    {
      heading: {
        ar: "متطلبات الدخول لحاملي الجواز السعودي",
        en: "Entry requirements for Saudi passport holders",
      },
      body: {
        ar: "تدرج جهات الهجرة الإندونيسية الرسمية المملكة العربية السعودية ضمن جنسيات تأشيرة الوصول لفئة الزيارة، بإقامة أولية حتى 30 يومًا وإمكانية تمديد واحد وفق الإجراء المنشور. ويُطلب من الركاب الدوليين تعبئة تصريح الوصول الرقمي على منصة All Indonesia الحكومية، والتصريح مجاني. ويُفرض على السياح الأجانب رسم خاص بزيارة بالي يُدفع عبر بوابة Love Bali الرسمية وفق تعليماتها، وله فئات إعفاء منشورة. لا شيء من ذلك يضمن الدخول؛ القرار لضابط الهجرة، والقواعد تتغير، فافحص المصدر الرسمي قبل السفر.",
        en: "Indonesia's official immigration authorities list Saudi Arabia among the nationalities eligible for a visit-category visa on arrival, with an initial stay of up to 30 days and one extension under the published procedure. International passengers are also required to complete the digital arrival declaration on the government All Indonesia platform; the declaration is free. Foreign tourists are additionally charged a levy for visiting Bali, paid through the official Love Bali portal under its instructions, with published exemption categories. None of this guarantees entry; the decision rests with the immigration officer, and the rules change, so check the official source before travel.",
      },
      checks: [
        {
          ar: "تحقق من إدراج جوازك في القائمة الرسمية قبل الحجز.",
          en: "Confirm your passport is on the official list before booking.",
        },
        {
          ar: "املأ تصريح الوصول من النطاق الحكومي قبل الوصول.",
          en: "Complete the arrival declaration on the government domain before arrival.",
        },
        {
          ar: "راجع صفحة الرسم الرسمية وقائمة الإعفاء قبل الوصول.",
          en: "Review the official levy page and its exemption list before arrival.",
        },
      ],
    },
  ],
  sources: [
    {
      label: {
        ar: "مكتب الهجرة في مطار نغوراه راي: خدمات الأجانب وتأشيرة الوصول",
        en: "Ngurah Rai Airport Immigration Office: foreign national services and visa on arrival",
      },
      href: "https://ngurahrai.imigrasi.go.id/layanan-wna/",
    },
    {
      label: {
        ar: "منصة All Indonesia الحكومية لتصريح الوصول",
        en: "Government All Indonesia arrival declaration platform",
      },
      href: "https://allindonesia.imigrasi.go.id/",
    },
    {
      label: {
        ar: "مكتب الهجرة في باتام: تصريح الوصول عبر All Indonesia ومجانيته",
        en: "Batam Immigration Office: the All Indonesia arrival declaration and that it is free of charge",
      },
      href: "https://batam.imigrasi.go.id/berita/2025/09/arrival-passengers-at-three-international-airports-and-ports-in-batam-are-required-to-declare-their-arrival-through-the-all-indonesia-application",
    },
    {
      label: {
        ar: "حكومة بالي: الأسئلة الشائعة لرسم السياح الأجانب",
        en: "Bali Provincial Government: foreign tourist levy FAQ",
      },
      href: "https://lovebali.baliprov.go.id/faq",
    },
    {
      label: {
        ar: "حكومة بالي: بوابة Love Bali الرسمية",
        en: "Bali Provincial Government: official Love Bali portal",
      },
      href: "https://lovebali.baliprov.go.id/",
    },
    {
      label: {
        ar: "هيئة الأرصاد الإندونيسية في بالي: مصطلحات الموسم وتعريفاته",
        en: "Indonesian Meteorological Agency in Bali: season terminology and definitions",
      },
      href: "https://bbmkg3.bmkg.go.id/daftar-istilah-musim",
    },
  ],
},
] as const;

export function getReviewedGuides(): readonly TravelGuide[] {
  return TRAVEL_GUIDES.filter((guide) => guide.status === "reviewed");
}

export function getGuide(slug: string): TravelGuide | undefined {
  return TRAVEL_GUIDES.find((guide) => guide.slug === slug);
}
