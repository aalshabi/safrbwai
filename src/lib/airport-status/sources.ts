import type { LinkRef } from "./types";

/** The link that opens the worldwide disruption map. */
export const DISRUPTION_MAP: LinkRef = {
  name: "Flightradar24",
  url: "https://www.flightradar24.com/data/airport-disruption",
};

/** Sources a visitor can check directly. Links only: none is scraped. */
export const REFERENCE_SOURCES: readonly (LinkRef & { labelAr: string })[] = [
  { ...DISRUPTION_MAP, labelAr: "خريطة اضطرابات المطارات — Flightradar24" },
  { name: "GACA", url: "https://www.gaca.gov.sa/", labelAr: "الهيئة العامة للطيران المدني" },
  { name: "KKIA", url: "https://www.kkia.sa/en/flights/departures-and-arrivals", labelAr: "رحلات مطار الملك خالد الدولي" },
  { name: "KFIA", url: "https://kfia.sa/Flights", labelAr: "رحلات مطار الملك فهد الدولي" },
  { name: "FlightAware", url: "https://www.flightaware.com/live/cancelled", labelAr: "الرحلات الملغاة — FlightAware" },
  { name: "Safe Airspace", url: "https://safeairspace.net/", labelAr: "تنبيهات الأجواء — Safe Airspace" },
];
