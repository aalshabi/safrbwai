import { randomUUID } from "node:crypto";
import { ipAddress } from "@vercel/functions";
import {
  HOTEL_NAME_MAX_BODY_BYTES,
  HOTEL_NAME_SCHEMA_VERSION,
  HOTEL_SEARCH_MAX_BODY_BYTES,
  HOTEL_SEARCH_SCHEMA_VERSION,
} from "./constants";
import { isHotelProviderError } from "./errors";
import { logHotelServerError } from "./logging";
import { validateHotelNameInput, validateHotelSearchInput } from "./validation";
import type {
  HotelApiErrorCode,
  HotelApiErrorResponse,
  HotelDataProvider,
  SourcedLocalizedHotelName,
  SourcedHotel,
} from "./types";
import type { RateLimiter } from "@/lib/offer-pipeline/api/rate-limit";

const MESSAGES = {
  disabled: {
    ar: "بحث الفنادق غير مفعّل حاليًا.",
    en: "Hotel search is not currently enabled.",
  },
  invalid: {
    ar: "بيانات بحث الفندق غير صالحة.",
    en: "The hotel-search request is invalid.",
  },
  tooLarge: {
    ar: "طلب بحث الفندق أكبر من الحد المسموح.",
    en: "The hotel-search request is too large.",
  },
  rateLimited: {
    ar: "تم إرسال طلبات بحث كثيرة خلال وقت قصير. حاول لاحقًا.",
    en: "Too many hotel-search requests were sent. Try again later.",
  },
  unavailable: {
    ar: "تعذّر الوصول إلى مصدر بيانات الفندق الآن.",
    en: "The hotel-data source is currently unavailable.",
  },
} as const;

type HotelSearchResponse =
  | Readonly<{
      ok: true;
      schemaVersion: typeof HOTEL_SEARCH_SCHEMA_VERSION;
      requestId: string;
      data: Readonly<{
        source: "google_places";
        results: readonly SourcedHotel[];
      }>;
    }>
  | HotelApiErrorResponse<typeof HOTEL_SEARCH_SCHEMA_VERSION>;

type HotelNameResponse =
  | Readonly<{
      ok: true;
      schemaVersion: typeof HOTEL_NAME_SCHEMA_VERSION;
      requestId: string;
      data: Readonly<{
        source: "google_places";
        placeId: string;
        localizedName: SourcedLocalizedHotelName | null;
      }>;
    }>
  | HotelApiErrorResponse<typeof HOTEL_NAME_SCHEMA_VERSION>;

type HotelSearchHandlerDependencies = Readonly<{
  enabled?: boolean;
  providerFactory: () => HotelDataProvider;
  rateLimiter: RateLimiter;
}>;

type HotelNameHandlerDependencies = HotelSearchHandlerDependencies;

function safeLocalizedName(value: unknown): SourcedLocalizedHotelName | null {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid localized hotel name");
  }
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !["text", "languageCode"].includes(key))) {
    throw new Error("Invalid localized hotel name");
  }
  if (typeof candidate.text !== "string") {
    throw new Error("Invalid localized hotel name");
  }
  const normalized = candidate.text.normalize("NFKC").trim();
  if (
    !normalized ||
    normalized.length > 300 ||
    /[\u0000-\u001F\u007F-\u009F]/u.test(normalized) ||
    (candidate.languageCode !== "ar" && candidate.languageCode !== "en")
  ) {
    throw new Error("Invalid localized hotel name");
  }
  return { text: normalized, languageCode: candidate.languageCode };
}

function json(
  body: HotelSearchResponse | HotelNameResponse,
  status: number,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function error<SchemaVersion extends
  | typeof HOTEL_SEARCH_SCHEMA_VERSION
  | typeof HOTEL_NAME_SCHEMA_VERSION>(
  requestId: string,
  code: HotelApiErrorCode,
  message: (typeof MESSAGES)[keyof typeof MESSAGES],
  schemaVersion: SchemaVersion
): HotelApiErrorResponse<SchemaVersion> {
  return {
    ok: false,
    schemaVersion,
    requestId,
    error: { code, message },
  };
}

function clientKey(request: Request): string {
  const platformIp = ipAddress(request);
  if (platformIp) return platformIp;
  const header =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");
  return header?.split(",")[0]?.trim() || "unknown";
}

async function readLimitedBody(
  request: Request,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false }> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false };
  }
  if (!request.body) return { ok: true, text: "" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(bytes) };
}

export function createHotelSearchHandler({
  enabled = false,
  providerFactory,
  rateLimiter,
}: HotelSearchHandlerDependencies) {
  return async function handleHotelSearch(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    try {
      if (!enabled) {
        return json(
          error(requestId, "HOTEL_SEARCH_DISABLED", MESSAGES.disabled, HOTEL_SEARCH_SCHEMA_VERSION),
          503
        );
      }

      const rate = rateLimiter.check(clientKey(request));
      if (!rate.allowed) {
        return json(
          error(
            requestId,
            "RATE_LIMIT_EXCEEDED",
            MESSAGES.rateLimited,
            HOTEL_SEARCH_SCHEMA_VERSION
          ),
          429,
          { "retry-after": String(rate.retryAfterSeconds) }
        );
      }

      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_SEARCH_SCHEMA_VERSION),
          400
        );
      }

      const body = await readLimitedBody(request, HOTEL_SEARCH_MAX_BODY_BYTES);
      if (!body.ok) {
        return json(
          error(
            requestId,
            "PAYLOAD_TOO_LARGE",
            MESSAGES.tooLarge,
            HOTEL_SEARCH_SCHEMA_VERSION
          ),
          413
        );
      }

      let raw: unknown;
      try {
        raw = JSON.parse(body.text);
      } catch {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_SEARCH_SCHEMA_VERSION),
          400
        );
      }

      const validation = validateHotelSearchInput(raw);
      if (!validation.ok) {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_SEARCH_SCHEMA_VERSION),
          400
        );
      }

      try {
        const provider = providerFactory();
        const results = await provider.search(validation.value);
        return json(
          {
            ok: true,
            schemaVersion: HOTEL_SEARCH_SCHEMA_VERSION,
            requestId,
            data: { source: "google_places", results },
          },
          200
        );
      } catch (providerError) {
        const code = isHotelProviderError(providerError)
          ? providerError.code
          : "PROVIDER_UNAVAILABLE";
        logHotelServerError({
          requestId,
          code,
          status: 503,
          durationMs: Date.now() - startedAt,
          providerMethod: "text_search",
        });
        return json(
          error(
            requestId,
            "PROVIDER_UNAVAILABLE",
            MESSAGES.unavailable,
            HOTEL_SEARCH_SCHEMA_VERSION
          ),
          503
        );
      }
    } catch {
      logHotelServerError({
        requestId,
        code: "INTERNAL_ERROR",
        status: 500,
        durationMs: Date.now() - startedAt,
      });
      return json(
        error(requestId, "INTERNAL_ERROR", MESSAGES.unavailable, HOTEL_SEARCH_SCHEMA_VERSION),
        500
      );
    }
  };
}

export function createHotelNameHandler({
  enabled = false,
  providerFactory,
  rateLimiter,
}: HotelNameHandlerDependencies) {
  return async function handleHotelName(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const startedAt = Date.now();

    try {
      if (!enabled) {
        return json(
          error(requestId, "HOTEL_SEARCH_DISABLED", MESSAGES.disabled, HOTEL_NAME_SCHEMA_VERSION),
          503
        );
      }

      const rate = rateLimiter.check(clientKey(request));
      if (!rate.allowed) {
        return json(
          error(
            requestId,
            "RATE_LIMIT_EXCEEDED",
            MESSAGES.rateLimited,
            HOTEL_NAME_SCHEMA_VERSION
          ),
          429,
          { "retry-after": String(rate.retryAfterSeconds) }
        );
      }

      if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_NAME_SCHEMA_VERSION),
          400
        );
      }

      const body = await readLimitedBody(request, HOTEL_NAME_MAX_BODY_BYTES);
      if (!body.ok) {
        return json(
          error(
            requestId,
            "PAYLOAD_TOO_LARGE",
            MESSAGES.tooLarge,
            HOTEL_NAME_SCHEMA_VERSION
          ),
          413
        );
      }

      let raw: unknown;
      try {
        raw = JSON.parse(body.text);
      } catch {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_NAME_SCHEMA_VERSION),
          400
        );
      }

      const validation = validateHotelNameInput(raw);
      if (!validation.ok) {
        return json(
          error(requestId, "BAD_REQUEST", MESSAGES.invalid, HOTEL_NAME_SCHEMA_VERSION),
          400
        );
      }

      try {
        const provider = providerFactory();
        const sourcedName = safeLocalizedName(
          await provider.getLocalizedName(
            validation.value.placeId,
            validation.value.locale
          )
        );
        // A name Google returned in a fallback language is not the requested
        // alternate-locale name, so the public contract reports none.
        const localizedName =
          sourcedName?.languageCode === validation.value.locale ? sourcedName : null;
        return json(
          {
            ok: true,
            schemaVersion: HOTEL_NAME_SCHEMA_VERSION,
            requestId,
            data: {
              source: "google_places",
              placeId: validation.value.placeId,
              localizedName,
            },
          },
          200
        );
      } catch (providerError) {
        const code = isHotelProviderError(providerError)
          ? providerError.code
          : "PROVIDER_UNAVAILABLE";
        logHotelServerError({
          requestId,
          code,
          status: 503,
          durationMs: Date.now() - startedAt,
          providerMethod: "place_details",
        });
        return json(
          error(
            requestId,
            "PROVIDER_UNAVAILABLE",
            MESSAGES.unavailable,
            HOTEL_NAME_SCHEMA_VERSION
          ),
          503
        );
      }
    } catch {
      logHotelServerError({
        requestId,
        code: "INTERNAL_ERROR",
        status: 500,
        durationMs: Date.now() - startedAt,
      });
      return json(
        error(requestId, "INTERNAL_ERROR", MESSAGES.unavailable, HOTEL_NAME_SCHEMA_VERSION),
        500
      );
    }
  };
}
