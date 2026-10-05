import { defineRegressionFixture } from "../types";

export const ARABIC_REGRESSION_FIXTURES = [
  defineRegressionFixture(
    {
      id: "ar-core-essentials",
      locale: "ar",
      category: "core_essentials",
      description: "وجهة ومدة وسعر صريحة في عرض عربي موجز",
      syntheticInput: "عرض إلى دبي لمدة 5 ليالٍ، السعر الإجمالي 3200 ريال.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination"],
      mustMarkMissing: ["travellers", "taxes", "cancellationPolicy"],
      mustNotAsk: ["visa", "insurance"],
      expectedValues: {
        totalPrice: { amount: 3200, currency: "SAR" },
        currency: "SAR",
        nights: 5,
        destination: {
          value: "دبي",
          canonicalValue: "Dubai",
          countryCode: "AE",
          matchType: "canonical_alias",
        },
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-relatively-complete",
      locale: "ar",
      category: "relatively_complete",
      description: "عرض عربي صناعي يغطي الحقول الأساسية ومعظم الحقول الموصى بها",
      syntheticInput:
        "عرض إلى جدة لمدة 4 ليالٍ لشخصين، الإقامة في فندق 4 نجوم، شامل الإفطار، السعر الإجمالي 4800 ريال شامل الضرائب والرسوم، استقبال وتوصيل خاص من المطار، أمتعة 23 كجم، إلغاء مجاني.",
    },
    {
      mustConfirm: [
        "totalPrice",
        "currency",
        "nights",
        "destination",
        "travellers",
        "board",
        "baggage",
        "transfers",
      ],
      mustNotMarkMissing: [
        "totalPrice",
        "currency",
        "nights",
        "destination",
        "travellers",
        "accommodation",
        "board",
        "transfers",
        "taxes",
        "cancellationPolicy",
      ],
      mustNotAsk: ["visa", "insurance"],
      expectedValues: {
        totalPrice: { amount: 4800, currency: "SAR" },
        nights: 4,
        travellers: { adults: 2 },
        accommodation: "فندق 4 نجوم",
        board: "BB",
        baggage: "23kg",
        transfers: { included: true },
        taxes: { included: true },
        cancellationPolicy: "إلغاء مجاني",
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-missing-cancellation",
      locale: "ar",
      category: "missing_cancellation",
      description: "عرض عربي مكتمل نسبيًا دون سياسة إلغاء",
      syntheticInput:
        "عرض إلى الرياض لمدة 3 ليالٍ لشخصين في فندق 5 نجوم، شامل الإفطار، شامل الضرائب والرسوم، السعر الإجمالي 2600 ريال، استقبال وتوصيل خاص، أمتعة 20 كجم.",
    },
    {
      mustMarkMissing: ["cancellationPolicy"],
      mustNotMarkMissing: ["taxes", "transfers", "baggage"],
      mustAsk: ["cancellationPolicy"],
      mustNotAsk: ["visa", "insurance"],
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-missing-taxes",
      locale: "ar",
      category: "missing_taxes",
      description: "عرض عربي يذكر سياسة الإلغاء ولا يذكر الضرائب",
      syntheticInput:
        "عرض إلى أبوظبي لمدة ليلتين لشخصين في فندق 4 نجوم مع الإفطار، السعر الإجمالي 2100 ريال، استقبال وتوصيل خاص، أمتعة 15 كجم، الإلغاء مجاني.",
    },
    {
      mustMarkMissing: ["taxes"],
      mustNotMarkMissing: ["cancellationPolicy"],
      mustAsk: ["taxes"],
      mustNotAsk: ["visa", "insurance"],
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-explicit-currency",
      locale: "ar",
      category: "explicit_currency",
      description: "عملة صريحة دون مبلغ نهائي",
      syntheticInput: "العملة المعتمدة SAR لعرض إلى دبي لمدة 3 ليالٍ.",
    },
    {
      mustConfirm: ["currency", "nights", "destination"],
      mustNotConfirm: ["totalPrice"],
      mustMarkMissing: ["totalPrice"],
      mustAsk: ["totalPrice"],
      expectedValues: { currency: "SAR", nights: 3 },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-conflicting-prices",
      locale: "ar",
      category: "conflicting_prices",
      description: "عرض صناعي يذكر سعرين نهائيين مختلفين",
      syntheticInput: "عرض إلى دبي لمدة 4 ليالٍ؛ السعر النهائي 3200 ريال، والسعر النهائي 3500 ريال.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination"],
      mustDetectContradictions: ["multiple_prices"],
      expectedValues: { totalPrice: { amount: 3200, currency: "SAR" } },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-conflicting-nights",
      locale: "ar",
      category: "conflicting_nights",
      description: "عرض صناعي يذكر عددين مختلفين لليالي",
      syntheticInput: "عرض إلى مسقط بسعر إجمالي 2900 ريال، يتضمن 4 ليالٍ، ويذكر لاحقًا 6 ليالٍ.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination"],
      mustDetectContradictions: ["conflicting_nights"],
      expectedValues: { nights: 4 },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-canonical-destination",
      locale: "ar",
      category: "canonical_destination",
      description: "وجهة عربية من قاموس الوجهات القياسي",
      syntheticInput: "باقة إلى دبي لمدة 3 ليالٍ بسعر إجمالي 1800 ريال.",
    },
    {
      mustConfirm: ["destination", "nights", "totalPrice", "currency"],
      expectedValues: {
        destination: {
          value: "دبي",
          canonicalValue: "Dubai",
          countryCode: "AE",
          matchType: "canonical_alias",
        },
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-explicit-destination",
      locale: "ar",
      category: "explicit_destination",
      description: "وجهة خيالية مذكورة صراحة خارج القاموس",
      syntheticInput: "عرض إلى وادي النجوم لمدة 3 ليالٍ بسعر إجمالي 1700 ريال.",
    },
    {
      mustConfirm: ["destination", "nights", "totalPrice", "currency"],
      expectedValues: {
        destination: { value: "وادي النجوم", matchType: "explicit_mention" },
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-board-accommodation",
      locale: "ar",
      category: "board_and_accommodation",
      description: "نوع إقامة وفئة فندق مذكوران بوضوح",
      syntheticInput: "الإقامة في فندق 5 نجوم لمدة 2 ليلة، شامل الإفطار، بسعر إجمالي 2400 ريال في جدة.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "board"],
      mustNotMarkMissing: ["accommodation", "board"],
      mustNotAsk: ["board", "accommodation", "visa", "insurance"],
      expectedValues: { accommodation: "فندق 5 نجوم", board: "BB" },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-price-basis-consistent",
      locale: "ar",
      category: "price_basis_consistent",
      description: "سعر للشخص وإجمالي متسقان مع الإفطار والنقل دون اختراع وجهة من المطار",
      syntheticInput:
        "عرض لشخصين بالغين، غرفة واحدة، لمدة 5 ليالٍ، السعر 1,200 ريال للشخص، والإجمالي 2,400 ريال، يشمل الإفطار والنقل من وإلى المطار، ولا توجد معلومات عن الإلغاء أو الأمتعة أو مدة الترانزيت.",
    },
    {
      mustConfirm: ["totalPrice", "perPersonPrice", "currency", "nights", "travellers", "board", "transfers"],
      mustNotConfirm: ["destination"],
      mustMarkMissing: ["destination", "cancellationPolicy", "baggage"],
      mustDetectContradictions: [],
      expectedValues: {
        totalPrice: { amount: 2400, currency: "SAR" },
        perPersonPrice: { amount: 1200, currency: "SAR" },
        nights: 5,
        travellers: { adults: 2 },
        board: "BB",
        transfers: { included: true },
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-price-basis-missing",
      locale: "ar",
      category: "price_basis_missing",
      description: "مبلغ بلا عملة أو أساس سعر لا يتحول إلى إجمالي مخترع",
      syntheticInput:
        "عرض سفر، السعر 1,200 بلا عملة أو تحديد هل هو للشخص أم للإجمالي، والإلغاء حسب الشروط.",
    },
    {
      mustNotConfirm: ["totalPrice", "perPersonPrice", "perNightPrice", "statedPrice", "currency"],
      mustMarkMissing: ["totalPrice", "currency"],
      mustAsk: ["totalPrice", "currency"],
    }
  ),
  defineRegressionFixture(
    {
      id: "ar-price-total-mismatch",
      locale: "ar",
      category: "price_total_mismatch",
      description: "تعارض حسابي مثبت بين سعر الشخص والإجمالي وعدد المسافرين",
      syntheticInput: "عرض سفر لشخصين، السعر 1,200 ريال للشخص، والإجمالي 2,000 ريال.",
    },
    {
      mustConfirm: ["totalPrice", "perPersonPrice", "currency", "travellers"],
      mustDetectContradictions: ["price_total_mismatch"],
      mustAsk: ["totalPrice"],
      expectedValues: {
        totalPrice: { amount: 2000, currency: "SAR" },
        perPersonPrice: { amount: 1200, currency: "SAR" },
        travellers: { adults: 2 },
      },
    }
  ),
] as const;
