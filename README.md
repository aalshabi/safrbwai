# سافر بوعي — SafrBwai

سافر بوعي أداة تساعدك على مراجعة المعلومات الواردة في عروض السفر واتخاذ قرار أوضح قبل الحجز.

SafrBwai helps you review the information stated in travel offers and make a clearer decision before booking.

## نطاق ما قبل الإطلاق

- تحليل عروض السفر النصية فقط.
- تحليل حتمي قائم على قواعد.
- لا يستخدم AI أو LLM.
- يدعم العربية والإنجليزية.
- ملفات PDF والصور والروابط غير مدعومة.
- لا توجد حسابات مستخدمين مفعّلة في التدفق الحالي.
- لا تُحفظ نصوص العروض أو نتائج التحليل في قاعدة بيانات.
- Feedback معطّل. توجد واجهة قياس محايدة للمزوّد بأحداث وخصائص محددة، والإرسال الخارجي معطّل.
- تتوفر ثلاثة أدلة مراجعة موثقة مع تاريخ مراجعة ظاهر، وتبقى الفهرسة العامة معطّلة.
- النتائج استشارية ولا تضمن صحة العرض أو البائع.

## Pre-launch scope

- Text analysis only.
- Deterministic rule-based analysis.
- No AI or LLM.
- Arabic and English are supported.
- PDF files, images, and links are not supported.
- User accounts are not enabled in the current flow.
- Offer text and analysis results are not stored in a database.
- Feedback is disabled. A provider-neutral allowlisted event interface exists, with external transmission disabled.
- Three sourced offer-review guides include visible review dates; public indexing remains disabled.
- Results are advisory and are not a guarantee of the offer or seller.

## طريقة العمل

يلصق المستخدم نص عرض السفر في صفحة تحليل العرض. يُرسل النص إلى API التحليل لتنفيذ الطلب باستخدام المحرك الحتمي القائم على القواعد. قد تعرض النتيجة دليلًا مختصرًا مأخوذًا من النص، لكن هذا الدليل لا يدخل في نصوص النسخ ولا يُخزّن.

The user pastes a travel-offer text into the offer-analysis page. The text is sent to the analysis API and processed by the deterministic rule-based engine. The result may show short evidence taken from the text, but that evidence is excluded from copied output and is not stored.

لا تُدخل بيانات شخصية أو معلومات دفع. تحقّق من المصدر الرسمي قبل أي حجز أو التزام مالي.

Do not enter personal or payment information. Verify with the official source before booking or making a financial commitment.

## التشغيل المحلي

```bash
npm install
npm run dev
```

يفتح التطبيق افتراضيًا على:

```text
http://localhost:3000
```

## الفحوص

```bash
npm run typecheck
npm run lint
npm test
npm run test:regression
npm run build
```

## الحالة

هذا إصدار ما قبل الإطلاق. ملفات الخصوصية والشروط مسودات أولية تحتاج مراجعة قانونية قبل أي إطلاق تجاري.

© 2026 سافر بوعي · SafrBwai — Abdullah Travel Lab
