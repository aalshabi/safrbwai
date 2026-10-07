"use client";

import * as React from "react";
import {
  AlertCircle,
  Building2,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

type BusinessStatus =
  | "OPERATIONAL"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY";

type SafeHotel = Readonly<{
  placeId: string;
  requestedLocaleName: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  primaryType: string;
  businessStatus?: BusinessStatus;
  googleMapsUri?: string;
  source: "google_places";
}>;

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; hotels: readonly SafeHotel[] }
  | { kind: "empty" }
  | { kind: "error"; error: "invalid" | "rateLimited" | "unavailable" };

const HOTEL_TYPES = new Set([
  "bed_and_breakfast",
  "budget_japanese_inn",
  "extended_stay_hotel",
  "guest_house",
  "hostel",
  "hotel",
  "inn",
  "japanese_inn",
  "lodging",
  "motel",
  "resort_hotel",
]);
const BUSINESS_STATUSES = new Set<BusinessStatus>([
  "OPERATIONAL",
  "CLOSED_TEMPORARILY",
  "CLOSED_PERMANENTLY",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.normalize("NFKC").trim();
  if (
    !normalized ||
    normalized.length > max ||
    /[\u0000-\u001F\u007F-\u009F]/u.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function safeMapsUri(value: unknown): string | undefined {
  const raw = safeString(value, 2_048);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const allowedHost =
      url.hostname === "maps.google.com" ||
      (url.hostname === "www.google.com" && url.pathname.startsWith("/maps"));
    return url.protocol === "https:" && allowedHost ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseHotel(value: unknown): SafeHotel | null {
  if (!isRecord(value) || value.source !== "google_places") return null;
  const placeId = safeString(value.placeId, 256);
  const requestedLocaleName = safeString(value.requestedLocaleName, 300);
  const primaryType = safeString(value.primaryType, 100);
  if (
    !placeId ||
    !/^[A-Za-z0-9_-]+$/.test(placeId) ||
    !requestedLocaleName ||
    !primaryType ||
    !HOTEL_TYPES.has(primaryType)
  ) {
    return null;
  }

  const formattedAddress = safeString(value.formattedAddress, 500);
  const businessStatus = BUSINESS_STATUSES.has(value.businessStatus as BusinessStatus)
    ? (value.businessStatus as BusinessStatus)
    : undefined;
  const googleMapsUri = safeMapsUri(value.googleMapsUri);

  let latitude: number | undefined;
  let longitude: number | undefined;
  if (value.latitude !== undefined || value.longitude !== undefined) {
    if (
      typeof value.latitude !== "number" ||
      typeof value.longitude !== "number" ||
      !Number.isFinite(value.latitude) ||
      !Number.isFinite(value.longitude) ||
      value.latitude < -90 ||
      value.latitude > 90 ||
      value.longitude < -180 ||
      value.longitude > 180
    ) {
      return null;
    }
    latitude = value.latitude;
    longitude = value.longitude;
  }

  return {
    placeId,
    requestedLocaleName,
    primaryType,
    source: "google_places",
    ...(formattedAddress ? { formattedAddress } : {}),
    ...(latitude !== undefined && longitude !== undefined
      ? { latitude, longitude }
      : {}),
    ...(businessStatus ? { businessStatus } : {}),
    ...(googleMapsUri ? { googleMapsUri } : {}),
  };
}

function parseSearchResponse(value: unknown): readonly SafeHotel[] | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    value.schemaVersion !== "hotel-search.v1" ||
    !isRecord(value.data) ||
    value.data.source !== "google_places" ||
    !Array.isArray(value.data.results) ||
    value.data.results.length > 5
  ) {
    return null;
  }
  const hotels = value.data.results.map(parseHotel);
  return hotels.every((hotel): hotel is SafeHotel => hotel !== null) ? hotels : null;
}

function parseLocalizedName(value: unknown, expectedPlaceId: string): string | null | undefined {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    value.schemaVersion !== "hotel-name.v1" ||
    !isRecord(value.data) ||
    value.data.source !== "google_places" ||
    value.data.placeId !== expectedPlaceId
  ) {
    return undefined;
  }
  if (value.data.localizedName === null) return null;
  return safeString(value.data.localizedName, 300);
}

function statusFromResponse(status: number): "invalid" | "rateLimited" | "unavailable" {
  if (status === 400 || status === 413) return "invalid";
  if (status === 429) return "rateLimited";
  return "unavailable";
}

function distinctName(alternate: string | null, primary: string): string | null {
  if (!alternate) return null;
  return alternate.normalize("NFKC").toLocaleLowerCase() ===
    primary.normalize("NFKC").toLocaleLowerCase()
    ? null
    : alternate;
}

export function HotelAnalyzer({ enabled = false }: { enabled?: boolean }) {
  const { locale, t } = useLanguage();
  const th = t.analyzeHotel;
  const identity = th.identity;
  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState<SearchState>({ kind: "idle" });
  const [selected, setSelected] = React.useState<SafeHotel | null>(null);
  const [alternateName, setAlternateName] = React.useState<string | null>(null);
  const [alternateError, setAlternateError] = React.useState(false);
  const resultRef = React.useRef<HTMLDivElement>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!enabled) return;
    const query = name.normalize("NFKC").trim();
    const normalizedCity = city.normalize("NFKC").trim();
    if (query.length < 2 || query.length > 120 || normalizedCity.length > 80) {
      setState({ kind: "error", error: "invalid" });
      return;
    }

    setSelected(null);
    setAlternateName(null);
    setAlternateError(false);
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/hotels/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          ...(normalizedCity ? { city: normalizedCity } : {}),
          locale,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        setState({ kind: "error", error: statusFromResponse(response.status) });
        return;
      }
      const hotels = parseSearchResponse(await response.json());
      if (!hotels) {
        setState({ kind: "error", error: "unavailable" });
      } else if (hotels.length === 0) {
        setState({ kind: "empty" });
      } else {
        setState({ kind: "results", hotels });
      }
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setState({ kind: "error", error: "unavailable" });
    }
  }

  async function selectHotel(hotel: SafeHotel) {
    setSelected(hotel);
    setAlternateName(null);
    setAlternateError(false);
    try {
      const response = await fetch("/api/hotels/name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: hotel.placeId, locale: locale === "ar" ? "en" : "ar" }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        setAlternateError(true);
        return;
      }
      const localizedName = parseLocalizedName(await response.json(), hotel.placeId);
      if (localizedName === undefined) {
        setAlternateError(true);
        return;
      }
      setAlternateName(distinctName(localizedName, hotel.requestedLocaleName));
    } catch {
      setAlternateError(true);
    }
  }

  const statusLabel = (status: BusinessStatus) => {
    if (status === "OPERATIONAL") return identity.statuses.operational;
    if (status === "CLOSED_TEMPORARILY") return identity.statuses.temporarilyClosed;
    return identity.statuses.permanentlyClosed;
  };

  return (
    <>
      <PageHeader icon={Building2} title={th.title} subtitle={th.subtitle} />
      <div className="container mt-4 pb-20 sm:-mt-8">
        <Card className="mx-auto max-w-2xl shadow-xl">
          <CardContent className="p-6 md:p-8">
            {!enabled && (
              <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <h2 className="font-bold">{identity.disabledTitle}</h2>
                    <p className="mt-1 text-sm leading-6">{identity.disabledBody}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="mb-5 text-sm leading-6 text-muted-foreground">{identity.dataNotice}</p>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="hotel-name">{th.inputLabel}</Label>
                <Input id="hotel-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={th.inputPlaceholder} disabled={!enabled || state.kind === "loading"} minLength={2} maxLength={120} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotel-city">{th.cityLabel}</Label>
                <Input id="hotel-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder={th.cityPlaceholder} disabled={!enabled || state.kind === "loading"} maxLength={80} />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={!enabled || state.kind === "loading"}>
                {state.kind === "loading" ? (
                  <><LoaderCircle className="animate-spin" aria-hidden="true" />{identity.searching}</>
                ) : (
                  <><Search aria-hidden="true" />{identity.searchAction}</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div ref={resultRef} tabIndex={-1} className="mx-auto mt-8 max-w-4xl scroll-mt-24 outline-none" aria-live="polite" aria-busy={state.kind === "loading"}>
          {state.kind === "error" && <Card><CardContent className="p-6 text-sm text-destructive">{identity.errors[state.error]}</CardContent></Card>}
          {state.kind === "empty" && (
            <Card><CardContent className="p-6"><h2 className="font-display text-xl font-bold">{identity.emptyTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{identity.emptyBody}</p></CardContent></Card>
          )}
          {state.kind === "results" && !selected && (
            <section aria-labelledby="hotel-results-title">
              <h2 id="hotel-results-title" className="font-display text-2xl font-bold">{identity.resultsTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{state.hotels.length} {identity.resultCount}</p>
              {state.hotels.length > 1 && <p className="mt-3 rounded-lg bg-muted p-3 text-sm">{identity.ambiguousBody}</p>}
              <div className="mt-4 grid gap-4">
                {state.hotels.map((hotel) => (
                  <Card key={hotel.placeId}>
                    <CardContent className="p-5">
                      <h3 className="font-display text-lg font-bold">{hotel.requestedLocaleName}</h3>
                      {hotel.formattedAddress && <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{hotel.formattedAddress}</p>}
                      <Button className="mt-4 w-full sm:w-auto" onClick={() => void selectHotel(hotel)}>{identity.selectAction}</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="font-semibold">{identity.source}: </span>
                <span translate="no">{identity.attribution}</span>
              </p>
            </section>
          )}
          {selected && (
            <section aria-labelledby="selected-hotel-title">
              <Card><CardContent className="p-6 md:p-8">
                <p className="text-sm font-semibold text-teal">{identity.selectedTitle}</p>
                <h2 id="selected-hotel-title" className="mt-1 font-display text-2xl font-bold">{selected.requestedLocaleName}</h2>
                {alternateName && <p className="mt-2 text-sm"><span className="font-semibold">{identity.alternateName}: </span><span lang={locale === "ar" ? "en" : "ar"}>{alternateName}</span></p>}
                {alternateError && <p className="mt-3 text-sm text-muted-foreground">{identity.errors.alternateUnavailable}</p>}
                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  {selected.formattedAddress && <div><dt className="font-semibold">{identity.address}</dt><dd className="mt-1 text-muted-foreground">{selected.formattedAddress}</dd></div>}
                  {selected.latitude !== undefined && selected.longitude !== undefined && <div><dt className="font-semibold">{identity.location}</dt><dd className="mt-1 text-muted-foreground" dir="ltr">{selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}</dd></div>}
                  <div><dt className="font-semibold">{identity.placeType}</dt><dd className="mt-1 text-muted-foreground">{selected.primaryType.replaceAll("_", " ")}</dd></div>
                  {selected.businessStatus && <div><dt className="font-semibold">{identity.businessStatus}</dt><dd className="mt-1 text-muted-foreground">{statusLabel(selected.businessStatus)}</dd></div>}
                </dl>
                <div className="mt-6 border-t border-border pt-4 text-sm">
                  <span className="font-semibold">{identity.source}: </span><span translate="no">{identity.attribution}</span>
                  {selected.googleMapsUri && <a href={selected.googleMapsUri} target="_blank" rel="noopener noreferrer" className="ms-4 inline-flex items-center gap-1 font-semibold text-teal underline-offset-4 hover:underline">{identity.openSource}<ExternalLink className="size-3.5" aria-hidden="true" /></a>}
                </div>
              </CardContent></Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
