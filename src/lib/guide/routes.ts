import { PRODUCT_CAPABILITIES, getCapability } from "@/lib/product/capabilities";
import type { Locale } from "@/lib/i18n/config";
import type { GuideDefinition, GuideRoute, GuideStep, LocalizedGuideText } from "./types";

const text = (ar: string, en: string): LocalizedGuideText => ({ ar, en });

function step(
  route: GuideRoute,
  id: string,
  title: LocalizedGuideText,
  body: LocalizedGuideText,
  options: Omit<GuideStep, "route" | "id" | "title" | "body"> = {}
): GuideStep {
  return { route, id, title, body, ...options };
}

function capabilityBody(key: keyof typeof PRODUCT_CAPABILITIES): LocalizedGuideText {
  const capability = getCapability(key);
  return {
    ar: `${capability.title.ar}: ${capability.reason.ar}`,
    en: `${capability.title.en}: ${capability.reason.en}`,
  };
}

function previewSummary(locale: Locale): string {
  return Object.values(PRODUCT_CAPABILITIES)
    .filter(({ status, route }) => route && status !== "enabled")
    .map(({ title, reason }) => `${title[locale]} — ${reason[locale]}`)
    .join(" ");
}

const homeSteps: readonly GuideStep[] = [
  step("/", "home-stage", text("إصدار ما قبل الإطلاق", "Pre-launch release"), text(
    "هذه النسخة في مرحلة ما قبل الإطلاق، والنتائج إرشادية ويجب التحقق منها من المصدر الرسمي.",
    "This release is in pre-launch. Results are advisory and should be verified with the official source."
  )),
  step("/", "home-enabled", text("الأداة المتاحة الآن", "Available now"), capabilityBody("textOfferAnalysis"), {
    capability: "textOfferAnalysis",
  }),
  step("/", "home-other-tools", text("حالة الأقسام الأخرى", "Other sections"), {
    ar: previewSummary("ar"),
    en: previewSummary("en"),
  }),
  step("/", "home-privacy", text("استخدم نصًا آمنًا", "Use safe text"), text(
    "لا تُدخل أسماء أو بيانات شخصية أو معلومات دفع. استخدم عرضًا نصيًا غير حساس أو مجهّلًا.",
    "Do not enter names, personal data, or payment information. Use non-sensitive or anonymized offer text."
  )),
  step("/", "home-open-offer", text("ابدأ بتحليل العرض", "Start with offer analysis"), text(
    "انتقل إلى أداة تحليل عرض السفر النصي لمراجعة الحقائق والنواقص والتناقضات والأسئلة المقترحة.",
    "Open the text travel-offer analyzer to review confirmed facts, missing details, contradictions, and suggested questions."
  ), { href: "/analyze-offer" }),
];

const offerSteps: readonly GuideStep[] = [
  step("/analyze-offer", "offer-source", text("المصدر النصي", "Text source"), text(
    "النص هو المصدر الوحيد المدعوم حاليًا. PDF والصور والروابط غير متاحة.",
    "Text is the only supported source. PDF files, images, and links are unavailable."
  ), { target: "offer-source-text", capability: "textOfferAnalysis" }),
  step("/analyze-offer", "offer-paste", text("ألصق نصًا مجهّلًا", "Paste anonymized text"), text(
    "ألصق عرض سفر غير حساس بعد حذف الأسماء وبيانات التواصل والحجز والدفع.",
    "Paste non-sensitive travel-offer text after removing names, contact, booking, and payment data."
  ), { target: "offer-textarea" }),
  step("/analyze-offer", "offer-review", text("راجع الإدخال", "Review the input"), text(
    "بعد المتابعة، راجع النص الذي اخترته قبل إرساله للتحليل.",
    "After continuing, review the text you selected before sending it for analysis."
  ), { target: "offer-review" }),
  step("/analyze-offer", "offer-analyze", text("ابدأ التحليل", "Run the analysis"), text(
    "أرسل النص عندما تكون مستعدًا. لا يُعاد الإرسال تلقائيًا عند الخطأ.",
    "Send the text when ready. Errors never trigger an automatic retry."
  ), { target: "offer-submit" }),
  step("/analyze-offer", "offer-confirmed", text("الحقائق المؤكدة", "Confirmed facts"), text(
    "يعرض هذا القسم المعلومات المذكورة صراحة في العرض، لا افتراضات إضافية.",
    "This section shows information explicitly stated in the offer, without added assumptions."
  ), { target: "result-confirmed" }),
  step("/analyze-offer", "offer-missing", text("المعلومات الناقصة", "Missing information"), text(
    "راجع التفاصيل غير المذكورة قبل اتخاذ قرار أو دفع أي مبلغ.",
    "Review details that were not stated before making a decision or payment."
  ), { target: "result-missing" }),
  step("/analyze-offer", "offer-contradictions", text("التناقضات", "Contradictions"), text(
    "تظهر هنا القيم المتعارضة التي تحتاج تأكيدًا من البائع أو المصدر الرسمي.",
    "Conflicting values that need confirmation from the seller or official source appear here."
  ), { target: "result-contradictions" }),
  step("/analyze-offer", "offer-questions", text("الأسئلة المقترحة", "Suggested questions"), text(
    "استخدم ما يصل إلى خمسة أسئلة لطلب التفاصيل المهمة قبل الحجز.",
    "Use up to five questions to request important details before booking."
  ), { target: "result-questions" }),
  step("/analyze-offer", "offer-copy-questions", text("نسخ الأسئلة", "Copy questions"), text(
    "ينسخ الزر الأسئلة الحالية فقط دون نص العرض أو الدليل الداخلي.",
    "This copies only the current questions, without the offer text or internal evidence."
  ), { target: "copy-questions" }),
  step("/analyze-offer", "offer-copy-summary", text("نسخ الملخص", "Copy summary"), text(
    "ينسخ ملخصًا منظّمًا دون نص العرض أو الدليل أو بيانات التشخيص.",
    "This copies a structured summary without offer text, evidence, or diagnostic data."
  ), { target: "copy-summary" }),
  step("/analyze-offer", "offer-verify", text("تحقق قبل الالتزام", "Verify before committing"), text(
    "النتيجة تساعدك على المراجعة ولا تتحقق من البائع. أكد السعر والسياسات من المصدر الرسمي قبل الحجز أو الدفع.",
    "The result supports your review and does not verify the seller. Confirm prices and policies with the official source before booking or payment."
  )),
];

function previewSteps(
  route: GuideRoute,
  capability:
    | "hotelIdentityLookup"
    | "hotelOfferReview"
    | "destinationChecklist"
    | "hotelComparison"
    | "knowledgeLibrary",
  future: LocalizedGuideText
): readonly GuideStep[] {
  return [
    step(route, `${capability}-status`, text("حالة القسم", "Section status"), capabilityBody(capability), { capability }),
    step(route, `${capability}-scope`, text("النطاق المستقبلي", "Future scope"), future, { capability }),
  ];
}

export const GUIDE_DEFINITIONS: Readonly<Record<GuideRoute, GuideDefinition>> = {
  "/": { route: "/", steps: homeSteps },
  "/analyze-offer": { route: "/analyze-offer", steps: offerSteps },
  "/analyze-hotel": {
    route: "/analyze-hotel",
    steps: previewSteps("/analyze-hotel", "hotelIdentityLookup", text(
      "الواجهة مخصصة للبحث عن هوية الفندق من مصدر رسمي فقط. لا تعرض تقييمات أو أسعارًا أو توصيات، والاتصال بالمصدر غير مفعّل حاليًا.",
      "This preview only presents a disabled, source-backed hotel identity lookup interface. It shows no ratings, prices, or recommendations, and provider access is currently disabled."
    )),
  },
  "/analyze-destination": {
    route: "/analyze-destination",
    steps: previewSteps("/analyze-destination", "destinationChecklist", text(
      "لا توجد بيانات لحظية أو ادعاءات حكومية أو طقس أو تأشيرات. القائمة المستقبلية ستعتمد على مدخلات المستخدم ومصادر موثقة.",
      "There is no real-time, government, weather, or visa data. A future checklist will use user-provided inputs and documented sources."
    )),
  },
  "/compare-hotels": {
    route: "/compare-hotels",
    steps: previewSteps("/compare-hotels", "hotelComparison", text(
      "لا توجد مقارنة عاملة أو فائز حاليًا. المقارنة المستقبلية ستستخدم قيمًا يدخلها المستخدم دون بيانات مختلقة.",
      "There is no working comparison or winner today. A future comparison will use user-entered values without fabricated data."
    )),
  },
  "/knowledge": {
    route: "/knowledge",
    steps: previewSteps("/knowledge", "knowledgeLibrary", text(
      "تعرض الصفحة محتوى محليًا أوليًا فقط. لا يربط الدليل إلى محتوى أو مصدر غير موجود.",
      "The page contains initial local content only. The guide does not link to content or sources that do not exist."
    )),
  },
  "/dashboard": {
    route: "/dashboard",
    steps: [
      step("/dashboard", "dashboard-status", text("اللوحة غير مفعّلة", "Dashboard unavailable"), capabilityBody("localDashboard"), { capability: "localDashboard" }),
      step("/dashboard", "dashboard-storage", text("لا حسابات أو حفظ دائم", "No accounts or permanent saving"), text(
        "الحسابات والحفظ الدائم غير مفعّلين. لا يحفظ الدليل نص العرض أو نتيجة التحليل في التخزين المحلي.",
        "Accounts and permanent saving are disabled. The guide never stores offer text or analysis results in local storage."
      ), { capability: "accounts" }),
    ],
  },
};

export function getGuideDefinition(route: GuideRoute): GuideDefinition {
  return GUIDE_DEFINITIONS[route];
}
