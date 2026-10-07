import type { Locale } from "@/lib/i18n/config";

export type CapabilityStatus = "disabled" | "preview" | "enabled";

export type ProductCapabilityKey =
  | "textOfferAnalysis"
  | "travelGuides"
  | "hotelIdentityLookup"
  | "hotelOfferReview"
  | "destinationChecklist"
  | "hotelComparison"
  | "knowledgeLibrary"
  | "localDashboard"
  | "accounts"
  | "pdfInput"
  | "imageInput"
  | "urlInput"
  | "feedback"
  | "publicIndexing";

export type LocalizedText = Readonly<Record<Locale, string>>;

export type ProductCapability = Readonly<{
  key: ProductCapabilityKey;
  status: CapabilityStatus;
  title: LocalizedText;
  route: string | null;
  reason: LocalizedText;
  launchRequirement: LocalizedText;
  requiredForPublicLaunch: boolean;
}>;

export type NavigableProductCapability = ProductCapability &
  Readonly<{ route: string; status: "enabled" }>;

export const PRODUCT_CAPABILITIES = {
  textOfferAnalysis: {
    key: "textOfferAnalysis",
    status: "enabled",
    title: { ar: "تحليل عرض سفر", en: "Travel offer analysis" },
    route: "/analyze-offer",
    reason: {
      ar: "تحليل نصي حتمي متاح الآن.",
      en: "Deterministic text analysis is available now.",
    },
    launchRequirement: {
      ar: "استمرار اختبارات الدقة والخصوصية والأمان.",
      en: "Keep accuracy, privacy, and security checks passing.",
    },
    requiredForPublicLaunch: true,
  },
  travelGuides: {
    key: "travelGuides",
    status: "enabled",
    title: { ar: "أدلة مراجعة العرض", en: "Offer review guides" },
    route: "/guides",
    reason: {
      ar: "ثلاثة أدلة عملية موثقة تساعدك قبل الدفع.",
      en: "Three sourced checklists to use before paying.",
    },
    launchRequirement: {
      ar: "الحفاظ على المصادر وتاريخ المراجعة لكل دليل.",
      en: "Keep sources and review dates current for every guide.",
    },
    requiredForPublicLaunch: true,
  },
  hotelIdentityLookup: {
    key: "hotelIdentityLookup",
    status: "preview",
    title: { ar: "بحث هوية الفندق", en: "Hotel identity lookup" },
    route: "/analyze-hotel",
    reason: {
      ar: "واجهة البحث المبنية على مصدر رسمي جاهزة للمراجعة، لكنها غير مفعّلة ولا ترسل بيانات حاليًا.",
      en: "The source-backed lookup interface is ready for review, but it is disabled and sends no data.",
    },
    launchRequirement: {
      ar: "إكمال مراجعة الإسناد والتكلفة والاعتمادات ثم اعتماد تفعيل مستقل.",
      en: "Complete attribution, cost, and credential review, then approve activation separately.",
    },
    requiredForPublicLaunch: false,
  },
  hotelOfferReview: {
    key: "hotelOfferReview",
    status: "preview",
    title: { ar: "مراجعة عرض فندق", en: "Hotel offer review" },
    route: "/analyze-hotel",
    reason: {
      ar: "الواجهة متاحة للمعاينة، والمراجعة الفعلية لم تُفعّل بعد.",
      en: "The interface is available for preview; real review is not enabled yet.",
    },
    launchRequirement: {
      ar: "تنفيذ مراجعة حقيقية موثقة واختبارها.",
      en: "Implement and test a documented real review flow.",
    },
    requiredForPublicLaunch: false,
  },
  destinationChecklist: {
    key: "destinationChecklist",
    status: "preview",
    title: { ar: "قائمة مراجعة الوجهة", en: "Destination checklist" },
    route: "/analyze-destination",
    reason: {
      ar: "الواجهة متاحة للمعاينة، وقائمة المراجعة الفعلية لم تُفعّل بعد.",
      en: "The interface is available for preview; the real checklist is not enabled yet.",
    },
    launchRequirement: {
      ar: "تنفيذ قائمة ثابتة واضحة المصدر واختبارها.",
      en: "Implement and test a clearly sourced static checklist.",
    },
    requiredForPublicLaunch: false,
  },
  hotelComparison: {
    key: "hotelComparison",
    status: "preview",
    title: { ar: "مقارنة الفنادق", en: "Hotel comparison" },
    route: "/compare-hotels",
    reason: {
      ar: "واجهة المقارنة متاحة للمعاينة دون نتائج فعلية.",
      en: "The comparison interface is available for preview without real results.",
    },
    launchRequirement: {
      ar: "تنفيذ مقارنة حقيقية دون بيانات مختلقة واختبارها.",
      en: "Implement and test a real comparison without fabricated data.",
    },
    requiredForPublicLaunch: false,
  },
  knowledgeLibrary: {
    key: "knowledgeLibrary",
    status: "preview",
    title: { ar: "مكتبة معرفة السفر", en: "Travel knowledge library" },
    route: "/knowledge",
    reason: {
      ar: "محتوى محلي أولي متاح للمعاينة ويحتاج مراجعة تحريرية قبل الإطلاق.",
      en: "Initial local content is available for preview and needs editorial review before launch.",
    },
    launchRequirement: {
      ar: "مراجعة المحتوى والمصادر والنطاق تحريرياً.",
      en: "Complete editorial review of content, sources, and scope.",
    },
    requiredForPublicLaunch: false,
  },
  localDashboard: {
    key: "localDashboard",
    status: "disabled",
    title: { ar: "لوحة محلية", en: "Local dashboard" },
    route: "/dashboard",
    reason: {
      ar: "الحفظ المحلي الاختياري غير مفعّل.",
      en: "Optional local saving is not enabled.",
    },
    launchRequirement: {
      ar: "تنفيذ حفظ محلي اختياري واضح مع تحكم المستخدم.",
      en: "Implement explicit opt-in local saving with user controls.",
    },
    requiredForPublicLaunch: false,
  },
  accounts: {
    key: "accounts",
    status: "disabled",
    title: { ar: "الحسابات", en: "Accounts" },
    route: "/auth",
    reason: {
      ar: "الحسابات غير متاحة في الإصدار الحالي.",
      en: "Accounts are not available in the current release.",
    },
    launchRequirement: {
      ar: "ليست مطلوبة للإطلاق العام الحالي.",
      en: "Not required for the current public launch.",
    },
    requiredForPublicLaunch: false,
  },
  pdfInput: {
    key: "pdfInput",
    status: "disabled",
    title: { ar: "إدخال PDF", en: "PDF input" },
    route: null,
    reason: {
      ar: "قراءة PDF غير مدعومة.",
      en: "PDF reading is not supported.",
    },
    launchRequirement: {
      ar: "مراجعة أمنية وخصوصية كاملة قبل التفعيل.",
      en: "Complete security and privacy review before enabling.",
    },
    requiredForPublicLaunch: false,
  },
  imageInput: {
    key: "imageInput",
    status: "disabled",
    title: { ar: "إدخال الصور", en: "Image input" },
    route: null,
    reason: {
      ar: "قراءة الصور غير مدعومة.",
      en: "Image reading is not supported.",
    },
    launchRequirement: {
      ar: "مراجعة أمنية وخصوصية كاملة قبل التفعيل.",
      en: "Complete security and privacy review before enabling.",
    },
    requiredForPublicLaunch: false,
  },
  urlInput: {
    key: "urlInput",
    status: "disabled",
    title: { ar: "إدخال الروابط", en: "URL input" },
    route: null,
    reason: {
      ar: "جلب الروابط الخارجية غير مدعوم.",
      en: "External URL fetching is not supported.",
    },
    launchRequirement: {
      ar: "مراجعة SSRF والأمان والخصوصية قبل التفعيل.",
      en: "Complete SSRF, security, and privacy review before enabling.",
    },
    requiredForPublicLaunch: false,
  },
  feedback: {
    key: "feedback",
    status: "disabled",
    title: { ar: "الملاحظات", en: "Feedback" },
    route: null,
    reason: {
      ar: "جمع الملاحظات غير مفعّل ولا تُخزّن بيانات.",
      en: "Feedback collection is disabled and stores no data.",
    },
    launchRequirement: {
      ar: "تخزين دائم صريح أو إبقاء الواجهة مخفية.",
      en: "Provide explicit durable storage or keep the interface hidden.",
    },
    requiredForPublicLaunch: false,
  },
  publicIndexing: {
    key: "publicIndexing",
    status: "disabled",
    title: { ar: "الفهرسة العامة", en: "Public indexing" },
    route: null,
    reason: {
      ar: "الفهرسة معطلة خلال ما قبل الإطلاق.",
      en: "Indexing is disabled during pre-launch.",
    },
    launchRequirement: {
      ar: "لا تُفعّل إلا بعد اجتياز بوابة الإطلاق كاملة.",
      en: "Enable only after the complete launch gate passes.",
    },
    requiredForPublicLaunch: true,
  },
} as const satisfies Record<ProductCapabilityKey, ProductCapability>;

export function getCapability(key: ProductCapabilityKey): ProductCapability {
  return PRODUCT_CAPABILITIES[key];
}

export function isFeatureEnabled(key: ProductCapabilityKey): boolean {
  return getCapability(key).status === "enabled";
}

export function getNavigableCapabilities(): NavigableProductCapability[] {
  const capabilities: ProductCapability[] = Object.values(PRODUCT_CAPABILITIES);
  return capabilities.filter(
    (capability): capability is NavigableProductCapability =>
      capability.route !== null && capability.status === "enabled"
  );
}

export function getRequiredLaunchCapabilities(): ProductCapability[] {
  return Object.values(PRODUCT_CAPABILITIES).filter(
    (capability) => capability.requiredForPublicLaunch
  );
}
