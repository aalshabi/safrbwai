"use client";

import { AlertTriangle, ScrollText } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { PageHeader } from "@/components/shared/page-header";

type Doc = "privacy" | "terms";
type LegalLink = { href: string; label: string };
type Section = { h: string; p: string; links?: readonly LegalLink[] };

export const LEGAL_APPROVAL_NOTICE = {
  ar: "معتمدة من مالك المنتج لنطاق ما قبل الإطلاق. لا تمثل مراجعة قانونية مستقلة أو تصريحًا بالإطلاق التجاري.",
  en: "Approved by the Product Owner for the pre-launch scope. This is not independent legal review or authorization for commercial launch.",
};

const TITLES: Record<Doc, { ar: string; en: string }> = {
  privacy: { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  terms: { ar: "الشروط والأحكام", en: "Terms & Conditions" },
};

export const LEGAL_CONTENT: Record<Doc, Record<"ar" | "en", Section[]>> = {
  privacy: {
    ar: [
      {
        h: "نطاق ما قبل الإطلاق",
        p: "سافر بوعي أداة لمراجعة عروض السفر النصية في إصدار ما قبل الإطلاق. لا يوجد تسجيل دخول أو حسابات مستخدمين مفعّلة في التدفق الحالي.",
      },
      {
        h: "المصادر المدعومة",
        p: "تدعم الواجهة العاملة تحليل النص فقط. بحث هوية الفندق ما زال في وضع المعاينة وغير مفعّل، ولا يرسل اسم الفندق أو المدينة إلى Google حاليًا. رفع ملفات PDF أو الصور وتحليل الروابط غير مدعوم، ولا تُرسل هذه المصادر إلى API التحليل.",
      },
      {
        h: "بحث هوية الفندق المخطط",
        p: "إذا فُعّل بحث الفنادق الرسمي بعد المراجعة، سيرسل خادم سافر بوعي اسم الفندق، والمدينة الاختيارية، ولغة الواجهة المختارة إلى Google Places API (New) لإرجاع معلومات هوية المكان. لا يُرسل نص عرض السفر إلى Google ضمن هذا البحث، ولا يتصل المتصفح بـGoogle Places مباشرة.",
      },
      {
        h: "معالجة Google والمرجع القانوني",
        p: "عند تفعيل البحث الرسمي، تعالج Google مدخلات بحث الفندق وبيانات المكان وفق سياسة الخصوصية الخاصة بها. استخدم بحث الفندق فقط ببيانات غير حساسة، ولا تُدخل أسماء أشخاص أو بيانات حجز أو دفع أو هوية.",
        links: [
          { href: "https://policies.google.com/privacy", label: "سياسة خصوصية Google" },
        ],
      },
      {
        h: "تخزين وسجلات بحث الفندق",
        p: "لن يحفظ الإصدار الأول استعلام بحث الفندق أو استجابة Google الخام أو أسماء الفنادق أو العناوين أو الإحداثيات أو Place ID في قاعدة بيانات. قد تُسجل فقط بيانات تشغيلية عامة مثل Request ID وفئة الحالة والمدة وعدد النتائج واللغة، دون اسم الفندق أو المدينة أو محتوى الاستجابة.",
      },
      {
        h: "معالجة نص العرض",
        p: "عند طلب التحليل، يُرسل نص العرض إلى API التحليل لتنفيذ الطلب بواسطة محرك حتمي قائم على قواعد، دون AI أو LLM.",
      },
      {
        h: "التخزين والتسجيل",
        p: "لا يحفظ التطبيق نص العرض أو نتيجة التحليل في قاعدة بيانات، ولا يُسجل نص العرض أو الدليل المختصر في سجلات التشغيل.",
      },
      {
        h: "الدليل والنسخ",
        p: "قد يظهر دليل مختصر مأخوذ من نص العرض داخل نتيجة التحليل الحالية. لا يدخل هذا الدليل في نص نسخ الأسئلة أو الملخص، ولا يُخزّن.",
      },
      {
        h: "معرّف الطلب",
        p: "قد يظهر Request ID عند بعض أخطاء التطبيق لأغراض الدعم. لا يتضمن معرّف الطلب نص العرض أو الدليل.",
      },
      {
        h: "الملاحظات والتحليلات",
        p: "جمع الملاحظات غير مفعّل. يحتوي التطبيق على واجهة قياس محايدة للمزوّد تسجل أسماء أحداث محددة فقط: بدء التحليل واكتماله وفشله ونسخ المخرجات، مع لغة الواجهة ومصدر حملة منقّح فقط. الإرسال الخارجي معطّل حاليًا، ولا يدخل نص العرض أو الدليل أو النتيجة أو الاسم أو معلومات الاتصال أو الدفع في حمولة القياس.",
      },
      {
        h: "تفضيلات المتصفح",
        p: "قد تبقى تفضيلات اللغة والمظهر محليًا في متصفحك لتطبيق اختيارك عند الزيارات اللاحقة.",
      },
      {
        h: "مساعد الاستخدام",
        p: "قد يحفظ مساعد الاستخدام محليًا حالة إكمال الجولة أو تخطيها على هذا الجهاز. لا يحفظ نص العرض أو نتيجة التحليل أو أي بيانات شخصية.",
      },
      {
        h: "سلامة الإدخال",
        p: "لا تُدخل بيانات شخصية أو معلومات دفع ضمن نص العرض. استخدم نصًا غير حساس أو مجهّلًا.",
      },
    ],
    en: [
      {
        h: "Current pre-launch scope",
        p: "SafrBwai is a pre-launch tool for reviewing text travel offers. Sign-in and user accounts are not enabled in the current flow.",
      },
      {
        h: "Supported sources",
        p: "The working interface supports text analysis only. Hotel identity search remains a disabled preview and does not currently send a hotel name or city to Google. PDF uploads, image uploads, and link analysis are not currently supported, and those sources are not sent to the analysis API.",
      },
      {
        h: "Planned hotel identity search",
        p: "If official hotel search is enabled after review, the SafrBwai server will send the hotel name, optional city, and selected interface language to Google Places API (New) to return place identity information. Travel-offer text is not sent to Google as part of this search, and the browser does not call Google Places directly.",
      },
      {
        h: "Google processing and legal reference",
        p: "When official search is enabled, Google processes the hotel-search input and place data under its Privacy Policy. Use hotel search only with non-sensitive information, and do not enter personal names, booking data, payment data, or identity information.",
        links: [
          { href: "https://policies.google.com/privacy", label: "Google Privacy Policy" },
        ],
      },
      {
        h: "Hotel-search storage and logs",
        p: "The first release will not persist the hotel-search query, raw Google response, hotel names, addresses, coordinates, or Place ID in a database. Only general operational metadata such as the SafrBwai Request ID, status category, latency, result count, and locale may be logged, without the hotel name, city, or response content.",
      },
      {
        h: "Offer-text processing",
        p: "When analysis is requested, the offer text is sent to the analysis API and processed by a deterministic rule-based engine, without AI or an LLM.",
      },
      {
        h: "Storage and logging",
        p: "The application does not store the offer text or analysis result in a database, and it does not log the offer text or short evidence in operational logs.",
      },
      {
        h: "Evidence and copied output",
        p: "Short evidence taken from the offer text may appear in the current analysis result. It is excluded from copied questions and summaries and is not stored.",
      },
      {
        h: "Request ID",
        p: "A Request ID may appear for some application errors to support troubleshooting. The identifier does not contain the offer text or evidence.",
      },
      {
        h: "Feedback and analytics",
        p: "Feedback collection is disabled. The application includes a provider-neutral measurement interface for four allowlisted events: analysis start, completion, failure, and useful-output copy. Only interface locale and a sanitized campaign source are allowed. External transmission is currently disabled; offer text, evidence, results, names, contact information, and payment details cannot enter the analytics payload.",
      },
      {
        h: "Browser preferences",
        p: "Language and theme preferences may remain locally in your browser so the application can remember your choices.",
      },
      {
        h: "Usage guide",
        p: "The usage guide may store only the guide completion or skip state locally on this device. It does not store offer text, analysis results, or personal data.",
      },
      {
        h: "Input safety",
        p: "Do not enter personal or payment information in the offer text. Use non-sensitive or anonymized text.",
      },
    ],
  },
  terms: {
    ar: [
      {
        h: "طبيعة الخدمة",
        p: "سافر بوعي أداة استشارية تحلل النص الذي يقدمه المستخدم فقط في التدفق العامل حاليًا. النتائج تساعد على مراجعة المعلومات المذكورة ولا تمثّل نصيحة نهائية أو ضمانًا.",
      },
      {
        h: "نطاق الخدمة الحالي",
        p: "تحليل النص هو المصدر الوحيد المدعوم في إصدار ما قبل الإطلاق. بحث هوية الفندق ما زال معاينة معطلة ولا يرسل بيانات إلى Google. ملفات PDF والصور والروابط وميزات الحسابات غير مفعّلة.",
      },
      {
        h: "بيانات الفندق الرسمية المخططة",
        p: "إذا فُعّل بحث الفنادق بعد الاعتماد، ستعرض سافر بوعي حقول هوية مكان محدودة مصدرها Google Places API (New)، مثل الاسم والعنوان والموقع وحالة النشاط ورابط المصدر. التقييم وعدد المراجعات والمراجعات والصور والأسعار والتوفر ليست ضمن الإصدار الأول.",
      },
      {
        h: "شروط Google والإسناد",
        p: "تظل بيانات المكان من Google خاضعة لشروط Google Maps Platform وسياسة خصوصية Google. سيظهر إسناد Google Maps ورابط المصدر مع البيانات عند تفعيل الميزة. لا تكشط سافر بوعي صفحات Google Maps ولا تعرض بيانات تجريبية على أنها بيانات حقيقية.",
        links: [
          { href: "https://cloud.google.com/maps-platform/terms", label: "شروط Google Maps Platform" },
          { href: "https://policies.google.com/privacy", label: "سياسة خصوصية Google" },
        ],
      },
      {
        h: "حدود بيانات الفندق",
        p: "المعلومات المصدرية قد تكون ناقصة أو متغيرة أو غير محدثة، ولا تمثل تحققًا مستقلًا أو توصية من سافر بوعي. تحقّق من اسم الفندق وموقعه وحالته مع الفندق أو مصدره الرسمي قبل اتخاذ قرار.",
      },
      {
        h: "التحقق من البائع",
        p: "لا تتحقق سافر بوعي من هوية البائع أو صفته أو قدرته على تنفيذ العرض.",
      },
      {
        h: "لا حجز أو دفع",
        p: "لا تنفذ سافر بوعي حجزًا أو دفعًا. يجب التحقق من المصدر الرسمي قبل أي حجز أو التزام مالي.",
      },
      {
        h: "لا ضمان للسعر أو العرض",
        p: "لا نضمن دقة السعر أو التوفّر أو السياسات أو صحة العرض. قد تكون المعلومات ناقصة أو متغيرة، والنتائج استشارية فقط.",
      },
      {
        h: "سلامة الإدخال",
        p: "لا تُدخل بيانات شخصية أو معلومات دفع. استخدم نصًا غير حساس أو مجهّلًا عند تجربة الخدمة.",
      },
      {
        h: "الاستخدام المقبول",
        p: "توافق على عدم إساءة استخدام الخدمة أو تقديم محتوى غير قانوني أو ضار أو منتهك لحقوق الغير.",
      },
      {
        h: "الملكية الفكرية",
        p: "جميع حقوق الخدمة وتصميمها ومحتواها محفوظة، ولا يجوز إعادة استخدامها دون إذن.",
      },
      {
        h: "حدود المسؤولية",
        p: "تُقدَّم الخدمة «كما هي» دون ضمانات. لا نتحمّل مسؤولية قرار سفر أو خسارة تنتج عن الاعتماد على النتائج.",
      },
      {
        h: "التعديلات",
        p: "قد نحدّث هذه الشروط أو الخدمة، ويظهر أي تحديث عند نشره.",
      },
    ],
    en: [
      {
        h: "Nature of the service",
        p: "SafrBwai is an advisory tool that analyzes only the text provided by the user in the current working flow. Results help review the stated information and do not constitute final advice or a guarantee.",
      },
      {
        h: "Current service scope",
        p: "Text analysis is the only supported source in the current pre-launch release. Hotel identity search remains a disabled preview and does not send data to Google. PDF files, images, links, and account features are not enabled.",
      },
      {
        h: "Planned official hotel data",
        p: "If hotel search is enabled after approval, SafrBwai will display limited place-identity fields sourced from Google Places API (New), such as the name, address, location, business status, and source link. Ratings, review counts, reviews, photos, prices, and availability are not included in the first release.",
      },
      {
        h: "Google terms and attribution",
        p: "Google-sourced place data remains subject to the Google Maps Platform Terms and Google Privacy Policy. Google Maps attribution and a source link will appear with the data when the feature is enabled. SafrBwai does not scrape Google Maps pages or present preview data as real data.",
        links: [
          { href: "https://cloud.google.com/maps-platform/terms", label: "Google Maps Platform Terms" },
          { href: "https://policies.google.com/privacy", label: "Google Privacy Policy" },
        ],
      },
      {
        h: "Hotel-data limitations",
        p: "Source information may be incomplete, change, or become outdated, and it is not independent verification or a recommendation by SafrBwai. Verify the hotel name, location, and status with the hotel or its official source before deciding.",
      },
      {
        h: "Seller verification",
        p: "SafrBwai does not verify the seller’s identity, status, or ability to fulfill the offer.",
      },
      {
        h: "No booking or payment",
        p: "SafrBwai does not make bookings or process payments. Verify with the official source before booking or making a financial commitment.",
      },
      {
        h: "No price or offer guarantee",
        p: "We do not guarantee the accuracy of a price, availability, policy, or offer. Information may be incomplete or change, and results are advisory only.",
      },
      {
        h: "Input safety",
        p: "Do not enter personal or payment information. Use non-sensitive or anonymized text when trying the service.",
      },
      {
        h: "Acceptable use",
        p: "You agree not to misuse the service or submit unlawful, harmful, or rights-infringing content.",
      },
      {
        h: "Intellectual property",
        p: "All service rights, design, and content are reserved and may not be reused without permission.",
      },
      {
        h: "Limitation of liability",
        p: "The service is provided \"as is\" without warranties. We are not liable for a travel decision or loss arising from reliance on the results.",
      },
      {
        h: "Changes",
        p: "We may update these terms or the service, and any update appears when published.",
      },
    ],
  },
};

export function LegalPage({ doc }: { doc: Doc }) {
  const { locale } = useLanguage();
  const title = TITLES[doc][locale];
  const sections = LEGAL_CONTENT[doc][locale];

  return (
    <>
      <PageHeader icon={ScrollText} title={title} subtitle="" />
      <div className="container -mt-8 pb-20">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm font-medium text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>{LEGAL_APPROVAL_NOTICE[locale]}</span>
          </div>

          <div className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
            {sections.map((s, i) => (
              <section key={i} className="space-y-1.5">
                <h2 className="font-display text-lg font-bold text-foreground">
                  <span className="ltr-nums text-teal">{i + 1}.</span> {s.h}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.p}</p>
                {s.links && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {s.links.map((link) => (
                      <li key={link.href}>
                        <a
                          className="font-medium text-teal underline underline-offset-4 hover:text-teal/80"
                          href={link.href}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
