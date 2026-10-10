import { defineRegressionFixture } from "../types";

const COMPLETE_BASE =
  "Trip to Dubai for 5 nights for 2 adults at a 4-star hotel with bed and breakfast, total price SAR 4200 including all taxes and fees, airport transfers included, 23 kg baggage, free cancellation.";

export const ENGLISH_REGRESSION_FIXTURES = [
  defineRegressionFixture(
    {
      id: "en-baggage",
      locale: "en",
      category: "baggage",
      description: "Explicit checked-baggage allowance",
      syntheticInput: "Package to Dubai for 4 nights includes 23 kg baggage, total price SAR 4200.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "baggage"],
      mustNotMarkMissing: ["baggage"],
      mustNotAsk: ["baggage", "visa", "insurance"],
      expectedValues: { baggage: "23kg" },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-airport-transfers",
      locale: "en",
      category: "airport_transfers",
      description: "Airport transfers explicitly included",
      syntheticInput: "Trip to Doha for 3 nights, total price USD 1500, airport transfers included.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "transfers"],
      mustNotMarkMissing: ["transfers"],
      mustNotAsk: ["transfers", "visa", "insurance"],
      expectedValues: { transfers: { included: true } },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-travellers",
      locale: "en",
      category: "travellers",
      description: "Adults and children stated with explicit counts",
      syntheticInput: "Trip to Dubai for 5 nights for 2 adults and 1 child, total price SAR 5100.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "travellers"],
      mustNotMarkMissing: ["travellers"],
      expectedValues: { travellers: { adults: 2, children: 1 } },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-insurance-context",
      locale: "en",
      category: "insurance_context",
      description: "Insurance is raised without an inclusion decision",
      syntheticInput: `${COMPLETE_BASE} Travel insurance details will be confirmed later.`,
    },
    {
      mustNotConfirm: ["insurance"],
      mustMarkMissing: ["insurance"],
      mustAsk: ["insurance"],
      mustNotAsk: ["visa"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-insurance-absent",
      locale: "en",
      category: "insurance_absent",
      description: "No insurance context in an otherwise rich offer",
      syntheticInput: COMPLETE_BASE,
    },
    {
      mustNotConfirm: ["insurance"],
      mustNotAsk: ["insurance", "visa"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-visa-context",
      locale: "en",
      category: "visa_context",
      description: "Visa is raised without an inclusion decision",
      syntheticInput: `${COMPLETE_BASE} Visa requirements will be confirmed later.`,
    },
    {
      mustNotConfirm: ["visa"],
      mustMarkMissing: ["visa"],
      mustAsk: ["visa"],
      mustNotAsk: ["insurance"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-visa-absent",
      locale: "en",
      category: "visa_absent",
      description: "No visa context in an otherwise rich offer",
      syntheticInput: COMPLETE_BASE,
    },
    {
      mustNotConfirm: ["visa"],
      mustNotAsk: ["visa", "insurance"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-short-analyzable",
      locale: "en",
      category: "short_analyzable",
      description: "Short but analyzable text with three core values",
      syntheticInput: "Dubai, 3 nights, total price SAR 900.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination"],
      expectedValues: {
        totalPrice: { amount: 900, currency: "SAR" },
        nights: 3,
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-noisy-safe",
      locale: "en",
      category: "noisy_safe",
      description: "Noisy punctuation around a safe synthetic offer",
      syntheticInput: "LIMITED OFFER *** trip to Lisbon !!! 6 nights --- total price USD 1800 --- bed and breakfast.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "board"],
      mustNotMarkMissing: ["board"],
      expectedValues: { totalPrice: { amount: 1800, currency: "USD" }, nights: 6, board: "BB" },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-insufficient",
      locale: "en",
      category: "insufficient",
      description: "Non-empty text without analyzable offer facts",
      syntheticInput: "A special travel offer is available.",
    },
    {
      mustNotConfirm: ["totalPrice", "currency", "nights", "destination", "travellers"],
      mustMarkMissing: ["totalPrice", "currency", "nights", "destination", "travellers"],
      mustAsk: ["totalPrice", "currency", "nights"],
      mustNotAsk: ["visa", "insurance"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-price-basis-consistent",
      locale: "en",
      category: "price_basis_consistent",
      description: "Consistent per-person and total prices preserve breakfast and transfers without treating the airport as a destination",
      syntheticInput:
        "Travel offer for 2 adults, one room, 5 nights, price SAR 1,200 per person, total price SAR 2,400, includes breakfast and airport transfers. Cancellation, baggage and transit duration are not stated.",
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
      id: "en-price-basis-missing",
      locale: "en",
      category: "price_basis_missing",
      description: "A bare amount without currency or price basis does not become an invented total",
      syntheticInput:
        "Travel offer, price 1,200 with no currency and no indication whether it is per person or the total; cancellation is subject to terms.",
    },
    {
      mustNotConfirm: ["totalPrice", "perPersonPrice", "perNightPrice", "statedPrice", "currency"],
      mustMarkMissing: ["totalPrice", "currency"],
      mustAsk: ["totalPrice", "currency"],
    }
  ),
  defineRegressionFixture(
    {
      id: "en-price-total-mismatch",
      locale: "en",
      category: "price_total_mismatch",
      description: "A provable arithmetic mismatch uses the stated traveller count",
      syntheticInput: "2 adults. Total: SAR 2,000. Price SAR 1,200 per person.",
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
  defineRegressionFixture(
    {
      id: "en-decision-integrity-details",
      locale: "en",
      category: "decision_integrity_details",
      description: "Decision-ready offer preserves inclusions, room type and transit details without inventing airport-change status",
      syntheticInput:
        "Travel offer to Istanbul for 2 adults and 5 nights in one deluxe room. Price SAR 1,200 per person. Total: SAR 2,000 including taxes and breakfast; airport transfers included. Flights are not included, baggage 23 kg. Cancellation is subject to terms. The outbound flight stops in Doha for 7 hours, and the offer does not state whether an airport change is required.",
    },
    {
      mustConfirm: [
        "totalPrice",
        "perPersonPrice",
        "currency",
        "nights",
        "destination",
        "travellers",
        "roomType",
        "board",
        "baggage",
        "transfers",
        "taxes",
        "flight",
        "transitDuration",
        "stopCount",
      ],
      mustNotConfirm: ["airportChange", "cancellationPolicy"],
      mustMarkMissing: ["cancellationPolicy"],
      mustDetectContradictions: ["price_total_mismatch"],
      mustAsk: ["totalPrice", "cancellationPolicy", "airportChange"],
      expectedValues: {
        totalPrice: { amount: 2000, currency: "SAR" },
        perPersonPrice: { amount: 1200, currency: "SAR" },
        destination: {
          value: "Istanbul",
          canonicalValue: "Istanbul",
          countryCode: "TR",
          matchType: "canonical_alias",
        },
        travellers: { adults: 2 },
        roomType: "deluxe room",
        board: "BB",
        baggage: "23kg",
        transfers: { included: true },
        taxes: { included: true },
        flight: { included: false },
        transitDuration: { minutes: 420 },
        stopCount: 1,
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-mixed-flight-ground-context",
      locale: "en",
      category: "decision_integrity_details",
      description: "An explicit flight stop remains confirmed when a ground-transfer inclusion follows in the same clause",
      syntheticInput:
        "Travel offer to Istanbul for 2 adults and 5 nights. The outbound flight stops in Doha for 3 hours and airport shuttle is included.",
    },
    {
      mustConfirm: ["nights", "destination", "travellers", "transitDuration", "stopCount"],
      expectedValues: {
        transitDuration: { minutes: 180 },
        stopCount: 1,
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-ground-transport-not-flight",
      locale: "en",
      category: "ground_transport_not_flight",
      description: "Ground-transport stops do not become a transit duration or flight stop count",
      syntheticInput:
        "Travel offer to Istanbul for 2 adults and 5 nights. Total: SAR 2,000. Flights are included and the airport shuttle stops at the hotel for 2 hours. The offer includes flights and the bus stops in Doha for 2 hours.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "travellers"],
      mustNotConfirm: ["transitDuration", "stopCount"],
      expectedValues: {
        totalPrice: { amount: 2000, currency: "SAR" },
        transitDuration: undefined,
        stopCount: undefined,
      },
    }
  ),
  defineRegressionFixture(
    {
      id: "en-negated-inclusion",
      locale: "en",
      category: "negated_inclusion",
      description: "A negation before the inclusion word never becomes included for flights or transfers",
      syntheticInput:
        "Trip to Dubai for 4 nights, total price SAR 2800. The price does not include flights and does not include airport transfers.",
    },
    {
      mustConfirm: ["totalPrice", "currency", "nights", "destination", "flight", "transfers"],
      expectedValues: {
        totalPrice: { amount: 2800, currency: "SAR" },
        flight: { included: false },
        transfers: { included: false },
      },
    }
  ),
] as const;
