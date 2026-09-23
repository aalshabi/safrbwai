# التنظيم والمنصة — حقائق متغيرة تحكم تشغيل @SafrBwai

**وقت الفحص:** 2026-09-23 من 05:09 إلى 05:13 بتوقيت الرياض.

**قيد منهجي يجب قراءته أولاً:** أداة جلب الصفحات كانت محجوبة في بيئة الفحص، فلم تُفتح أي صفحة رسمية مباشرة. كل النتائج مأخوذة من ملخصات محرك البحث لصفحات رسمية وإعلامية. لذلك:
- أي حقيقة مصدرها رسمي منفرد مصنفة «مرجّح» لا «مؤكد».
- قبل أي قرار قانوني أو مالي، يفتح عبدالله الصفحة الرسمية بنفسه، ويُسجَّل تاريخ الفتح في `templates/source_log.csv`.

**موعد إعادة الفحص:** كل 30 يوماً، أو فور خبر عن تغيير.

## 1) تحليلات X

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| لوحة تحليلات الحساب الكاملة لمشتركي Premium أو Premium+ منذ يونيو 2024 | https://x.com/premium/status/1801292231774765140 · https://www.socialmediatoday.com/news/x-launches-advanced-analytics-for-premium-subscribers/718957/ | مرجّح | بدون Premium لا يمكن الوصول لخط أساس على مستوى الحساب |
| **تعارض:** صفحة X Business تقول إن التحليلات «مجانية لكل من لديه حساب إعلانات» | https://business.x.com/en/help/campaign-measurement-and-analytics/tweet-activity-dashboard | غير مؤكد، والأرجح أن الصفحة قديمة | يحسمه عبدالله بفتح analytics.x.com من الحساب |
| إحصاءات كل منشور منفرداً متاحة داخل التطبيق دون اشتراك | https://circleboom.com/blog/can-you-get-twitter-post-analytics-without-x-premium/ | مرجّح (مصدر مجتمعي) | بديل يدوي مؤقت |
| أسعار الويب: Basic بـ3$ وPremium بـ8$ وPremium+ بـ40$ شهرياً. السعر بالريال غير معروف | https://help.x.com/en/using-x/x-premium | مرجّح | **قرار إنفاق لعبدالله**، ولا يُتخذ نيابة عنه |
| تصدير CSV: حتى 30 يوماً في الملف الواحد، و3,000 منشور كحد أقصى، والتوقيت UTC | https://business.x.com/en/help/campaign-measurement-and-analytics/tweet-activity-dashboard | مرجّح | 90 يوماً تعني 3 ملفات، مع تحويل التوقيت إلى الرياض (+3) |
| **تعارض:** مدونات 2026 تقول إن التصدير يصل إلى 90 يوماً | https://nealschaffer.com/twitter-analytics/ · https://sociality.io/blog/twitter-analytics/ | إشارة ضعيفة | افترض 30 يوماً لكل ملف |
| المقاييس المتاحة: الظهور، والتفاعل، وزيارات الملف، والمتابعون الجدد، ونقرات الرابط، ونقرات الوسائط | نفس صفحة Business · socialmediatoday 2024 | مرجّح | تكفي لعمود X في `post_performance.csv` |
| تحليلات الفيديو وتصدير CSV في Media Studio للموثقين فقط | https://help.x.com/en/using-x/media-studio-analytics | مرجّح | مهم إن اعتمد الحساب على الفيديو القصير |

## 2) الإفصاح التجاري على X

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| علامة «Paid Partnership» مدمجة في المحرر، أو تضاف لاحقاً عبر Add content disclosure | https://techcrunch.com/2026/03/02/x-ads-paid-partnership-labels-for-creators-so-they-can-ditch-the-hashtags/ | مؤكد (أكثر من مصدر) | الأداة موجودة |
| السياسة تُلزم بالإفصاح عن «منشورات العلامة الخاصة لمن له مصلحة تجارية»، لكن لم يتأكد هل البند عام أم خاص بالمملكة المتحدة | https://help.x.com/en/rules-and-policies/paid-partnerships-policy | مرجّح، ونطاقه غير مؤكد | **الأحوط:** كل منشور يشير إلى Sky يحمل إفصاحاً |
| عدم الإفصاح قد يؤدي إلى حذف المنشور أو تقييد الحساب | نفس الرابط | مرجّح | خطر تشغيلي |
| العلامة قد تتطلب Premium أو أكثر من 1,000 متابع | https://humanadsai.com/blog/x-paid-partnership-label-how-to | إشارة ضعيفة | إن لم تظهر العلامة، يُكتب «إعلان» يدوياً |

## 3) الأتمتة والذكاء الاصطناعي والحقوق

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| ممنوع المحتوى المكرر والأتمتة المزعجة والنشر الآلي على الترندات | https://help.x.com/en/rules-and-policies/x-automation | مرجّح | يدعم قاعدة «لا نشر آلي» |
| جدولة مجانية من x.com على سطح المكتب، لا تشمل الثريدات | https://help.x.com/en/using-x/how-to-post | مرجّح | الثريدات تُنشر يدوياً |
| وسم «Made with AI» متاح، وهو اختياري حالياً | https://techweez.com/2026/03/02/x-rolls-out-made-with-ai-label/ | مؤكد (أكثر من مصدر) | **سياسة الحساب: إلزامي على أي وسيط مولد**، لأن حساباً يكشف الخدع لا يحتمل صورة مضللة |
| سياسة الوسائط المضللة، وعلامة «Manipulated Media» | https://help.x.com/en/rules-and-policies/manipulated-media | مرجّح | لا صورة مولدة تُعرض على أنها فندق أو وجهة حقيقية |
| X تستجيب لشكاوى DMCA | https://help.x.com/en/rules-and-policies/copyright-policy | مرجّح | لا صور فنادق أو صور الغير بلا رخصة |
| ضوابط الهيئة العامة لتنظيم الإعلام تُلزم باحترام الملكية الفكرية | https://gmedia.gov.sa/ar/services/licensing-for-providing-advertising-content-through-social-media-platforms-trusted | مرجّح | التزام محلي إضافي |

## 4) ترخيص «موثوق»

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| «موثوق» إلزامي للأفراد الذين يقدمون محتوى إعلانياً على منصات التواصل | https://gmedia.gov.sa/ar/services/licensing-for-providing-advertising-content-through-social-media-platforms-trusted | مؤكد | — |
| الرسوم 15,000 ريال لـ3 سنوات، ولم يُرصد تغيير في 2025–2026 | https://www.alriyadh.com/1974051 · https://www.nettresults.com/stories/2026/5/13/saudi-arabias-mawthooq-certification-has-changed-influencer-marketing-forever | مؤكد للرسوم، و«لا تغيير» مرجّح | قرار إنفاق لعبدالله |
| **استثناء:** إعلان الفرد عن منتجه أو خدمته عبر **حسابه الشخصي** لا يحتاج «موثوق» | https://x.com/media_ksa/status/1817516043587260845 · https://www.okaz.com.sa/news/local/2141169 | مؤكد | **غموض جوهري:** @SafrBwai حساب قناة بهوية مستقلة، لا حساب عبدالله الشخصي. هل ينطبق الاستثناء؟ **غير مؤكد** |
| أي إعلان لطرف ثالث (فندق، طيران، عمولة) يُسقط الاستثناء | استنتاج من نص الاستثناء | مرجّح | **لا شراكات مدفوعة مع أطراف ثالثة قبل حسم الترخيص** |
| الإفصاح بوسم عربي واضح داخل المادة، لا عبر رابط | https://istitlaa.ncc.gov.sa/ar/Media/GCAM/AdvertisingContent/Pages/default.aspx | مرجّح (مسودة استطلاع 2022) | «إعلان» داخل نص التغريدة نفسها |

**قرار A0 مطلوب من عبدالله:** إما استفسار مكتوب للهيئة، أو ربط الحساب صراحة بشخصه. إلى أن يُحسم، يحمل كل منشور فيه Sky الإفصاح ووسم «إعلان»، ولا تُعقد أي شراكة مع طرف ثالث.

## 5) إعلان وكالات السفر

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| لا يُمارس نشاط خدمات السفر دون ترخيص وزارة السياحة | https://uqn.gov.sa/?p=21006 · https://cdn.mt.gov.sa/mtportal/mt-fe-production/content/policies-regulations/documents/services-directory/Travel-and-Tourism-Services-Regulations-service-directory-Ar-V014.pdf | مؤكد | يُتحقق من ترخيص Sky ورقمه قبل أي دعوة تجارية |
| إعلان الأسعار شاملة الرسوم والضرائب، وإبلاغ العميل بسياسة الإلغاء | نفس اللائحة | مرجّح | أي سعر يُنشر يكون نهائياً شاملاً الضريبة، مع إشارة لشروط الإلغاء |
| ذكر رقم ترخيص الوكالة في الإعلان: لم يُعثر على نص صريح | https://amlak.net.sa/110187/ · https://www.spa.gov.sa/N2236283 | غير مؤكد | الأحوط وضع الرقم في صفحة الهبوط والبايو |
| طلبات التراخيص عبر منصة Tourism.sa منذ 2026-08-28 | https://tourism.sa/ar/e-services | مرجّح | إجرائي |
| ضوابط وزارة التجارة لإعلانات التواصل: التصريح بأنها إعلان، وذكر اسم المنتج ومقدم الخدمة، ومنع التضليل | https://www.spa.gov.sa/2186919 | مؤكد | كل منشور ترويجي يذكر «سكاي العالمية» ويحمل «إعلان» |
| غرامات فعلية على معلنين مخالفين | https://mc.gov.sa/ar/mediacenter/News/Pages/28-09-22-01.aspx | مؤكد | التطبيق فعلي |
| السعر المعروض شامل ضريبة القيمة المضافة | https://mc.gov.sa/ar/mediacenter/News/Pages/04-08-20-01.aspx | مؤكد للرف، وانطباقه على الإعلان استنتاج | لا تُكتب صيغة «+ ضريبة» |

## 6) الروابط

| الحقيقة | المصدر | الثقة | الأثر |
|---|---|---|---|
| كل رابط يُغلَّف بـ t.co ويُحسب 23 حرفاً | https://help.x.com/en/using-x/url-shortener | مؤكد | طول UTM لا يستهلك أحرفاً |
| t.co يمرر معاملات UTM، وقد يحذفها تحويل داخل الموقع | https://www.graphed.com/blog/what-does-t-co-mean-in-google-analytics | مرجّح (مجتمعي) | **اختبار إلزامي** لروابط صفحات Sky قبل الاستخدام |
| تصريح Musk في 2026-07-29 أن الروابط لم تُعاقب منذ أكثر من سنة | https://x.com/elonmusk/status/2082273378749268440 · https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ | مرجّح (تصريح لا سياسة مكتوبة) | — |
| **تعارض:** تلميح 2024 بتقليل ظهور الروابط، وادعاءات 2026 بانخفاض 50–70% | https://www.washingtontimes.com/news/2024/nov/26/elon-musk-hints-x-deprioritizes-links-keep-users-p/ | إشارة ضعيفة | **لا قاعدة ثابتة.** يختبر محلل الأداء الرابط في التغريدة الأصلية مقابل الرابط في الرد، بعد خط الأساس |
