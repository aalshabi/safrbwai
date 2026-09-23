/**
 * Travel Knowledge Engine
 * -----------------------
 * A structured, bilingual knowledge base spanning seven domains, plus a
 * lightweight semantic search that expands queries with a synonym graph and
 * matches across both languages. In production the `searchKnowledge` internals
 * would be swapped for a vector store + embeddings; the entry shape and the
 * public API are designed so that swap is drop-in.
 */

type Bi = { ar: string; en: string };

export type KnowledgeCategory =
  | "hotels"
  | "destinations"
  | "tips"
  | "visa"
  | "flights"
  | "weather"
  | "activities";

export const knowledgeCategories: KnowledgeCategory[] = [
  "hotels",
  "destinations",
  "tips",
  "visa",
  "flights",
  "weather",
  "activities",
];

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: Bi;
  summary: Bi;
  tags: string[];
}

export const knowledgeBase: KnowledgeEntry[] = [
  // ---- Hotels ----
  {
    id: "h1",
    category: "hotels",
    title: { ar: "كيف تكشف المراجعات المزيفة", en: "How to spot fake hotel reviews" },
    summary: {
      ar: "توزيع التواريخ، لغة المراجعة، وردود الإدارة — ست إشارات تفصل الحقيقي عن المزيّف.",
      en: "Date distribution, review language and management replies — six signals that separate real from fake.",
    },
    tags: ["reviews", "fake", "مراجعات", "مزيفة", "تقييمات", "ثقة", "ratings"],
  },
  {
    id: "h2",
    category: "hotels",
    title: { ar: "أفضل وقت لحجز الفندق", en: "The best time to book a hotel" },
    summary: {
      ar: "الأسعار تتغيّر بالموسم واليوم — متى تحجز فعلاً لتوفّر أكثر.",
      en: "Prices shift by season and day — when to actually book to save the most.",
    },
    tags: ["booking", "price", "حجز", "توقيت", "سعر", "توفير", "cheap"],
  },
  {
    id: "h3",
    category: "hotels",
    title: { ar: "رسوم الفندق المخفية", en: "Hidden hotel fees (resort fees)" },
    summary: {
      ar: "رسوم منتجع وخدمة وضرائب تُضاف عند الوصول — احسب السعر الحقيقي قبل الحجز.",
      en: "Resort, service and tax fees added on arrival — compute the true price before booking.",
    },
    tags: ["fees", "hidden", "رسوم", "مخفية", "منتجع", "resort", "taxes"],
  },
  {
    id: "h4",
    category: "hotels",
    title: { ar: "قراءة صور الغرف بذكاء", en: "Reading room photos like a pro" },
    summary: {
      ar: "عدسات واسعة وزوايا مختارة تخفي الحقيقة — كيف تقرأ الصور قبل أن تنخدع.",
      en: "Wide lenses and cherry-picked angles hide the truth — how to read photos before you're fooled.",
    },
    tags: ["photos", "rooms", "صور", "غرف", "misleading", "مضللة"],
  },

  // ---- Destinations ----
  {
    id: "d1",
    category: "destinations",
    title: { ar: "أفضل الوجهات للعائلات", en: "Best destinations for families" },
    summary: {
      ar: "وجهات آمنة وسهلة التنقّل مع أنشطة تناسب الأطفال والميزانية.",
      en: "Safe, easy-to-navigate destinations with kid-friendly activities and budgets.",
    },
    tags: ["family", "kids", "عائلات", "أطفال", "children", "safe", "آمنة"],
  },
  {
    id: "d2",
    category: "destinations",
    title: { ar: "وجهات آمنة للسفر المنفرد", en: "Safe destinations for solo travel" },
    summary: {
      ar: "مدن يسهل التنقّل فيها بأمان مع مجتمع مسافرين نشط.",
      en: "Cities that are safe and easy to get around with an active traveler community.",
    },
    tags: ["solo", "safety", "منفرد", "أمان", "alone", "وحدي", "security"],
  },
  {
    id: "d3",
    category: "destinations",
    title: { ar: "وجهات اقتصادية للمسافر العربي", en: "Budget destinations for Arab travelers" },
    summary: {
      ar: "قيمة عالية مقابل السعر: إقامة وطعام وتنقّل بأسعار في المتناول.",
      en: "High value for money: affordable stays, food and transport.",
    },
    tags: ["budget", "cheap", "رخيصة", "اقتصادية", "value", "قيمة", "affordable"],
  },
  {
    id: "d4",
    category: "destinations",
    title: { ar: "متى تزور كل وجهة؟ دليل المواسم", en: "When to visit: a seasons guide" },
    summary: {
      ar: "أفضل الشهور لكل منطقة لتفادي الذروة والطقس القاسي.",
      en: "The best months for each region to dodge peak crowds and harsh weather.",
    },
    tags: ["season", "timing", "موسم", "أفضل وقت", "when", "crowds", "ازدحام"],
  },

  // ---- Travel tips ----
  {
    id: "t1",
    category: "tips",
    title: { ar: "حقيبة السفر المثالية", en: "Packing the perfect bag" },
    summary: {
      ar: "قائمة أساسيات ذكية توفّر رسوم الأمتعة وتخفّف الحمل.",
      en: "A smart essentials list that saves baggage fees and lightens the load.",
    },
    tags: ["packing", "luggage", "حقيبة", "أمتعة", "baggage", "carry-on"],
  },
  {
    id: "t2",
    category: "tips",
    title: { ar: "كيف توفّر المال أثناء السفر", en: "How to save money while traveling" },
    summary: {
      ar: "حيل عملية للطعام والتنقّل والصرف الأجنبي تقلّل تكلفة الرحلة.",
      en: "Practical hacks for food, transport and FX that cut trip costs.",
    },
    tags: ["budget", "money", "توفير", "مال", "save", "cheap", "اقتصادي"],
  },
  {
    id: "t3",
    category: "tips",
    title: { ar: "تجنّب إرهاق الطيران (jet lag)", en: "Beating jet lag" },
    summary: {
      ar: "ضبط النوم والإضاءة والترطيب قبل وبعد الرحلات الطويلة.",
      en: "Managing sleep, light and hydration before and after long flights.",
    },
    tags: ["jetlag", "sleep", "إرهاق", "نوم", "long flight", "رحلة طويلة"],
  },
  {
    id: "t4",
    category: "tips",
    title: { ar: "الاتصال والإنترنت في الخارج", en: "Staying connected abroad (eSIM)" },
    summary: {
      ar: "شرائح eSIM والواي فاي المحلي بدل رسوم التجوال الباهظة.",
      en: "eSIMs and local Wi-Fi instead of costly roaming fees.",
    },
    tags: ["sim", "esim", "internet", "إنترنت", "شريحة", "roaming", "تجوال"],
  },

  // ---- Visa rules ----
  {
    id: "v1",
    category: "visa",
    title: { ar: "الفيزا عند الوصول مقابل المسبقة", en: "Visa on arrival vs. pre-arranged" },
    summary: {
      ar: "متى تكفي الفيزا عند الوصول ومتى يجب التقديم مسبقاً لتجنّب الرفض.",
      en: "When visa-on-arrival is enough and when to apply ahead to avoid refusal.",
    },
    tags: ["visa", "arrival", "تأشيرة", "وصول", "فيزا", "entry", "دخول"],
  },
  {
    id: "v2",
    category: "visa",
    title: { ar: "تأشيرة شنغن للمسافر الخليجي", en: "Schengen visa for Gulf travelers" },
    summary: {
      ar: "المستندات، المدة، والتأمين المطلوب لدخول أوروبا دون مفاجآت.",
      en: "Documents, timelines and insurance required to enter Europe without surprises.",
    },
    tags: ["schengen", "europe", "شنغن", "أوروبا", "visa", "تأشيرة", "insurance"],
  },
  {
    id: "v3",
    category: "visa",
    title: { ar: "تأشيرة الترانزيت والعبور", en: "Transit and layover visas" },
    summary: {
      ar: "بعض المطارات تتطلّب تأشيرة عبور حتى لو لم تغادر الصالة — تحقّق مسبقاً.",
      en: "Some airports need a transit visa even without leaving the terminal — check ahead.",
    },
    tags: ["transit", "layover", "ترانزيت", "عبور", "stopover", "airport", "مطار"],
  },
  {
    id: "v4",
    category: "visa",
    title: { ar: "صلاحية الجواز المطلوبة", en: "Required passport validity" },
    summary: {
      // No fixed period is stated: the requirement differs by destination
      // (Schengen asks for validity beyond departure, not a flat six months),
      // and a wrong number here costs the traveller the trip.
      ar: "الشرط يختلف بحسب الوجهة — تحقّق من مدة الصلاحية المطلوبة قبل الحجز.",
      en: "The requirement differs by destination — check the validity it asks for before booking.",
    },
    tags: ["passport", "validity", "جواز", "صلاحية", "6 months", "أشهر"],
  },

  // ---- Flight tips ----
  {
    id: "f1",
    category: "flights",
    title: { ar: "الترانزيت الوهمي: أكبر خدعة", en: "Fake transit: the biggest trick" },
    summary: {
      ar: "ترانزيت ١٤ ساعة يوصف كـ\"رحلة مريحة\" — كيف تكشفه قبل الحجز.",
      en: "A 14-hour layover sold as a 'comfortable trip' — how to spot it before booking.",
    },
    tags: ["transit", "layover", "ترانزيت", "وهمي", "fake", "long", "طويل"],
  },
  {
    id: "f2",
    category: "flights",
    title: { ar: "أرخص أيام حجز الطيران", en: "Cheapest days to book flights" },
    summary: {
      ar: "نوافذ التسعير وأدوات المقارنة لإيجاد أفضل سعر فعلي.",
      en: "Pricing windows and comparison tools to find the real best fare.",
    },
    tags: ["cheap", "booking", "رخيص", "حجز", "price", "سعر", "fare", "توفير"],
  },
  {
    id: "f3",
    category: "flights",
    title: { ar: "حقوق المسافر عند التأخير والإلغاء", en: "Your rights on delays and cancellations" },
    summary: {
      ar: "متى تستحق تعويضاً أو إعادة توجيه، وكيف تطالب به.",
      en: "When you're owed compensation or rerouting, and how to claim it.",
    },
    tags: ["delay", "cancellation", "تأخير", "إلغاء", "compensation", "تعويض", "rights", "حقوق"],
  },
  {
    id: "f4",
    category: "flights",
    title: { ar: "اختيار المقعد وحدود الأمتعة", en: "Seat selection and baggage limits" },
    summary: {
      ar: "تجنّب رسوم المقعد والأمتعة المفاجئة في تذاكر الأسعار المنخفضة.",
      en: "Avoid surprise seat and baggage fees on low-cost fares.",
    },
    tags: ["seat", "baggage", "مقعد", "أمتعة", "luggage", "fees", "رسوم"],
  },

  // ---- Weather ----
  {
    id: "w1",
    category: "weather",
    title: { ar: "أفضل المواسم لكل قارة", en: "Best seasons by region" },
    summary: {
      ar: "خريطة سريعة لأفضل شهور الزيارة حسب المناخ حول العالم.",
      en: "A quick map of the best months to visit by climate worldwide.",
    },
    tags: ["season", "climate", "موسم", "مناخ", "weather", "طقس", "when"],
  },
  {
    id: "w2",
    category: "weather",
    title: { ar: "السفر في موسم الأمطار", en: "Traveling in the rainy season" },
    summary: {
      ar: "كيف تستفيد من الأسعار المنخفضة وتتجنّب مخاطر الأمطار الموسمية.",
      en: "How to enjoy low prices while avoiding monsoon-season risks.",
    },
    tags: ["rain", "monsoon", "أمطار", "موسم", "rainy", "مطر", "storm"],
  },
  {
    id: "w3",
    category: "weather",
    title: { ar: "نصائح السفر في الحر الشديد", en: "Tips for extreme heat travel" },
    summary: {
      ar: "الترطيب والتوقيت والملابس لتفادي ضربات الشمس في وجهات الصيف.",
      en: "Hydration, timing and clothing to dodge heatstroke at summer destinations.",
    },
    tags: ["heat", "summer", "حر", "صيف", "hot", "hydration", "ترطيب"],
  },
  {
    id: "w4",
    category: "weather",
    title: { ar: "الطقس البارد والتزلج", en: "Cold weather and ski trips" },
    summary: {
      ar: "طبقات الملابس والمعدات والاحتياطات للوجهات الثلجية.",
      en: "Layering, gear and precautions for snowy destinations.",
    },
    tags: ["cold", "winter", "بارد", "شتاء", "snow", "ثلج", "ski", "تزلج"],
  },

  // ---- Activities ----
  {
    id: "a1",
    category: "activities",
    title: { ar: "أنشطة مجانية في المدن الكبرى", en: "Free activities in major cities" },
    summary: {
      ar: "جولات مشي ومتاحف بأيام مجانية وحدائق تغني عن التذاكر الغالية.",
      en: "Walking tours, free-museum days and parks that replace pricey tickets.",
    },
    tags: ["free", "budget", "مجاني", "أنشطة", "cheap", "walking", "متاحف"],
  },
  {
    id: "a2",
    category: "activities",
    title: { ar: "مغامرات لعشّاق الإثارة", en: "Adventures for thrill-seekers" },
    summary: {
      ar: "تسلّق وغوص ورياضات هوائية مع نصائح السلامة والحجز.",
      en: "Hiking, diving and air sports with safety and booking tips.",
    },
    tags: ["adventure", "hiking", "مغامرة", "تسلق", "diving", "غوص", "thrill"],
  },
  {
    id: "a3",
    category: "activities",
    title: { ar: "تجارب ثقافية أصيلة", en: "Authentic cultural experiences" },
    summary: {
      ar: "أسواق محلية وورش حرفية وضيافة تبعدك عن المصائد السياحية.",
      en: "Local markets, craft workshops and hospitality away from tourist traps.",
    },
    tags: ["culture", "local", "ثقافة", "محلي", "heritage", "تراث", "authentic"],
  },
  {
    id: "a4",
    category: "activities",
    title: { ar: "أنشطة عائلية مع الأطفال", en: "Family activities with kids" },
    summary: {
      ar: "حدائق وأكواريوم ومتاحف علوم تفاعلية تناسب جميع الأعمار.",
      en: "Parks, aquariums and interactive science museums for all ages.",
    },
    tags: ["family", "kids", "عائلية", "أطفال", "children", "aquarium", "حديقة"],
  },
];

// ---- Semantic search --------------------------------------------------------

/** Related-term graph — each group is treated as mutually synonymous, and
 *  crucially bridges Arabic ⇄ English so a query in one language matches the
 *  other. This is the lightweight stand-in for embeddings. */
const SYNONYM_GROUPS: string[][] = [
  ["cheap", "budget", "affordable", "save", "رخيص", "اقتصادي", "توفير", "منخفض"],
  ["expensive", "pricey", "غالي", "مرتفع"],
  ["visa", "entry", "permit", "تأشيرة", "فيزا", "دخول"],
  ["weather", "climate", "طقس", "مناخ"],
  ["hotel", "accommodation", "resort", "stay", "فندق", "إقامة", "منتجع"],
  ["flight", "flights", "airline", "plane", "طيران", "رحلة", "رحلات"],
  ["family", "kids", "children", "عائلة", "عائلي", "عائلية", "أطفال"],
  ["safe", "safety", "security", "آمن", "آمنة", "أمان", "سلامة"],
  ["solo", "alone", "منفرد", "وحدي"],
  ["book", "booking", "reserve", "حجز"],
  ["transit", "layover", "stopover", "ترانزيت", "عبور", "توقف"],
  ["baggage", "luggage", "أمتعة", "حقيبة", "شنطة"],
  ["season", "when", "timing", "موسم", "وقت", "توقيت"],
  ["adventure", "hiking", "trek", "مغامرة", "تسلق"],
  ["culture", "cultural", "heritage", "ثقافة", "ثقافي", "تراث"],
  ["free", "مجاني", "مجانية"],
  ["passport", "جواز"],
  ["delay", "cancellation", "تأخير", "إلغاء", "تعويض", "compensation"],
  ["rain", "monsoon", "rainy", "أمطار", "مطر"],
  ["hot", "heat", "summer", "حر", "صيف"],
  ["cold", "winter", "snow", "ski", "بارد", "شتاء", "ثلج", "تزلج"],
  ["reviews", "ratings", "fake", "مراجعات", "تقييمات", "مزيفة"],
  ["fees", "hidden", "رسوم", "مخفية"],
  ["europe", "schengen", "أوروبا", "شنغن"],
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "") // Arabic diacritics + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// term -> Set of related terms (normalized)
const SYN_INDEX: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    const norm = group.map(normalize);
    for (const term of norm) {
      if (!map.has(term)) map.set(term, new Set());
      norm.forEach((other) => map.get(term)!.add(other));
    }
  }
  return map;
})();

function expandToken(token: string): string[] {
  const related = SYN_INDEX.get(token);
  return related ? [token, ...related] : [token];
}

// Function words filtered out of queries (already normalized).
const STOPWORDS = new Set(
  [
    "the","in","a","an","of","to","for","on","at","and","or","is","are","be","with",
    "how","what","when","where","which","do","i","me","my","you","your","it","this","that",
    "في","من","الي","علي","عن","مع","او","ثم","هل","ما","اين","هذا","هذه","التي","الذي","كل",
  ].map(normalize)
);

function tokenize(q: string): string[] {
  const raw = q.split(" ").filter(Boolean);
  const kept = raw.filter(
    (w) => !STOPWORDS.has(w) && (w.length >= 3 || SYN_INDEX.has(w))
  );
  return Array.from(new Set(kept));
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

/** Word-boundary aware match: exact word, or fuzzy containment only for
 *  reasonably long terms (so "in" can never match "rain"). */
function wordMatch(variant: string, words: Set<string>): boolean {
  if (words.has(variant)) return true;
  if (variant.length >= 4) {
    for (const w of words) {
      if (w.length >= 4 && (w.includes(variant) || variant.includes(w))) return true;
    }
  }
  return false;
}

export interface SearchHit {
  entry: KnowledgeEntry;
  relevance: number; // 0-100
}

export function searchKnowledge(
  query: string,
  category: KnowledgeCategory | "all"
): SearchHit[] {
  const pool =
    category === "all" ? knowledgeBase : knowledgeBase.filter((e) => e.category === category);

  const tokens = tokenize(normalize(query));
  if (tokens.length === 0) {
    // No usable query: browse mode.
    return pool.map((entry) => ({ entry, relevance: 0 }));
  }
  const expanded = tokens.map(expandToken);

  const hits: SearchHit[] = [];
  for (const entry of pool) {
    const titleWords = wordSet(`${entry.title.ar} ${entry.title.en}`);
    const summaryWords = wordSet(`${entry.summary.ar} ${entry.summary.en}`);
    const tagWords = wordSet(entry.tags.join(" "));
    const catWords = wordSet(entry.category);

    let score = 0;
    let matchedTokens = 0;

    for (const variants of expanded) {
      let best = 0;
      for (const v of variants) {
        if (wordMatch(v, titleWords)) best = Math.max(best, 3);
        if (wordMatch(v, tagWords)) best = Math.max(best, 2.5);
        if (wordMatch(v, catWords)) best = Math.max(best, 2);
        if (wordMatch(v, summaryWords)) best = Math.max(best, 1.4);
      }
      if (best > 0) matchedTokens++;
      score += best;
    }

    if (matchedTokens > 0) {
      const coverage = matchedTokens / expanded.length;
      const relevance = Math.min(
        99,
        Math.max(
          14,
          Math.round((score / (expanded.length * 3)) * 100 * (0.55 + coverage * 0.45)) + 6
        )
      );
      hits.push({ entry, relevance });
    }
  }

  return hits.sort((a, b) => b.relevance - a.relevance);
}
