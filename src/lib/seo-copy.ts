/**
 * Search titles and descriptions for guides and insights.
 *
 * Kept apart from the content data (`guides.ts`, `travel-insights.ts`) on
 * purpose: `travel-insights.ts` also feeds the homepage cards, and the visible
 * titles stay as they are. Titles exclude the « | سافر بوعي» suffix that the
 * root layout appends; with it, every title stays within 60 characters and
 * every description within 120–155 characters (see seo-copy.test.ts). Each
 * description only promises what the page already covers.
 */

export type SeoCopy = { title: string; description: string };

export const GUIDE_SEO: Readonly<Record<string, SeoCopy>> = {
  "total-price-and-inclusions": {
    title: "السعر الشامل لعرض السفر: وش يشمل وش ما يشمل؟",
    description:
      "لا تعتمد على السعر الإعلاني. تعرّف على البنود التي يجب أن يظهرها العرض: الضرائب والرسوم والوجبات والنقل والأمتعة، وما يُدفع لاحقًا.",
  },
  "cancellation-and-changes": {
    title: "الإلغاء والاسترداد قبل الحجز: الأسئلة اللي تحميك",
    description:
      "اعرف آخر موعد للإلغاء بدون غرامة، ومن يرد المبلغ، وما الفرق بين سياسة الطيران والفندق والنقل، قبل ما تؤكد عرض السفر وتدفع.",
  },
  "transit-and-baggage": {
    title: "الترانزيت قبل الحجز: المدة والمطار والتأشيرة",
    description:
      "قبل ما تحجز رحلة فيها توقف: افحص مدة الترانزيت، وتغيير المطار أو الصالة، والحاجة لتأشيرة عبور، وهل الرحلات على حجز واحد.",
  },
};

export const INSIGHT_SEO: Readonly<Record<string, SeoCopy>> = {
  "verify-hotel-booking-site": {
    title: "هل حجزت من موقع الفندق الرسمي؟ خطوات التحقق",
    description:
      "إعلان يحمل اسم الفندق قد يقودك إلى وسيط يبدو رسميًا. خطوات عملية للتحقق من الموقع واسم الشركة والسعر الإجمالي قبل إدخال بياناتك أو الدفع.",
  },
  "award-winning-hotel-fit": {
    title: "فندق فائز بجائزة عالمية: هل يناسب رحلتك؟",
    description:
      "الجوائز تساعدك في تكوين قائمة أولية، لكنها لا تحسم الموقع ونوع الغرفة والخصوصية والتكلفة الفعلية. أسئلة عملية قبل اختيار الفندق والحجز.",
  },
  "ai-trip-planning-human-review": {
    title: "خطة رحلة بالذكاء الاصطناعي: ما الذي تراجعه؟",
    description:
      "استخدم الذكاء الاصطناعي لتسريع البحث، ثم راجع أوقات العمل وزمن الانتقال والتأشيرة والسعر من مصادر رسمية قبل اعتماد البرنامج والحجز.",
  },
  "flight-cancelled-saudi-airports-rights": {
    title: "رحلتك أُلغيت من الرياض أو الدمام؟ حقوقك الآن",
    description:
      "ماذا تقول لائحة حقوق المسافرين عن الاسترداد الكامل والرحلة البديلة والتعويض عند إلغاء الرحلة، ومتى يُعفى الناقل، وخطوات عملية قبل الذهاب للمطار.",
  },
  "schengen-2026-ees-etias-saudi-travelers": {
    title: "شنغن 2026 للسعوديين: EES والبصمة و ETIAS",
    description:
      "نظام الدخول والخروج الأوروبي يعمل منذ أبريل 2026، وتأشيرة شنغن باقية، و ETIAS لا يخص حامل التأشيرة. ما الذي تغيّر وكيف تتجنب المواقع المضللة.",
  },
  "japan-trip-hidden-taxes-2026": {
    title: "ضرائب رحلة اليابان 2026: المغادرة وكيوتو",
    description:
      "ضريبة مغادرة اليابان أصبحت 3,000 ين منذ يوليو 2026، وضريبة الإقامة في كيوتو متدرجة حتى 10,000 ين لليلة للشخص. احسبهما قبل مقارنة العروض والحجز.",
  },
};
