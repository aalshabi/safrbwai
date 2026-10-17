/**
 * SAMPLE DATA FOR DEVELOPMENT AND TESTS ONLY. Every record is flagged
 * `sample: true` and points to example.com, so it can never pass as a real
 * source; normalization rejects it outside development.
 */

const SAMPLE = { name: "عينة تطوير", url: "https://example.com/airport-status-sample", type: "manual_review" };

export function sampleFeed(now: Date) {
  const ago = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const base = (code: string, nameAr: string, cityAr: string, countryCode: string, observed: number) => ({
    airportCode: code,
    airportNameAr: nameAr,
    cityAr,
    countryCode,
    source: SAMPLE,
    observedAt: ago(observed),
    fetchedAt: ago(observed - 2),
    sample: true,
  });
  return {
    records: [
      { ...base("RUH", "مطار الملك خالد الدولي", "الرياض", "SA", 12), operationalStatus: "normal", delayPercentage: 8 },
      { ...base("JED", "مطار الملك عبدالعزيز الدولي", "جدة", "SA", 14), operationalStatus: "minor_delays", delayPercentage: 22, averageDelayMinutes: 25 },
      // Observed five hours ago: shown as stale, never as current.
      { ...base("DMM", "مطار الملك فهد الدولي", "الدمام", "SA", 300), operationalStatus: "normal" },
      { ...base("LHR", "مطار هيثرو", "لندن", "GB", 15), operationalStatus: "major_disruption", delayPercentage: 55, cancellationPercentage: 12, cancelledFlights: 140 },
      { ...base("AMS", "مطار سخيبول", "أمستردام", "NL", 16), operationalStatus: "minor_delays", delayPercentage: 20 },
      // A second sample source disagreeing: the more cautious status is shown.
      { ...base("AMS", "مطار سخيبول", "أمستردام", "NL", 40), operationalStatus: "normal", source: { ...SAMPLE, name: "عينة تطوير 2" } },
      {
        ...base("KTM", "مطار تريبهوفان الدولي", "كاتماندو", "NP", 20),
        operationalStatus: "suspended",
        suspensionEvidence: { name: "عينة إشعار رسمي", url: "https://example.com/suspension-notice-sample", type: "civil_aviation_authority" },
      },
    ],
  };
}
