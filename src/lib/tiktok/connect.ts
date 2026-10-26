import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { exchangeTikTokCode, listTikTokVideos, tiktokAuthorizeUrl } from "./api";
import type { TikTokConfig } from "./config";
import { MAX_HIGHLIGHTS } from "@/lib/social-highlights";
import { saveTikTokConnection, type LatestVideosDeps } from "./latest-videos";

export const STATE_COOKIE = "tiktok_oauth_state";
const STATE_COOKIE_PATH = "/api/tiktok";

function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

const stateCookie = (value: string, maxAge: number) =>
  `${STATE_COOKIE}=${value}; Path=${STATE_COOKIE_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

function page(status: number, message: string, clearState = false): Response {
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  if (clearState) headers.append("set-cookie", stateCookie("", 0));
  return new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>TikTok</title><p>${message}</p></html>`,
    { status, headers }
  );
}

/**
 * GET /api/tiktok/connect?key=… — the owner's one-time link to TikTok's
 * consent screen. Without the configured key it answers 404 like any unknown path.
 */
export function handleTikTokConnect(request: Request, config: TikTokConfig | null): Response {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!config || !sameSecret(key, config.connectKey)) return new Response("Not found", { status: 404 });
  const state = randomBytes(24).toString("hex");
  return new Response(null, {
    status: 302,
    headers: {
      location: tiktokAuthorizeUrl(config, state),
      "set-cookie": stateCookie(state, 600),
      "cache-control": "no-store",
    },
  });
}

/**
 * GET /api/tiktok/callback — TikTok returns here after consent. Checks the
 * state against the cookie set by /connect, swaps the code for tokens, saves
 * the refresh token and the newest videos, then lets the homepage refresh.
 */
export async function handleTikTokCallback(
  request: Request,
  { config, store, fetchImpl = fetch }: LatestVideosDeps,
  revalidateHome: () => void
): Promise<Response> {
  if (!config || !store) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const state = params.get("state") ?? "";
  const expected = readCookie(request, STATE_COOKIE);
  if (!expected || !state || !sameSecret(state, expected)) {
    return page(400, "انتهت صلاحية طلب الربط أو لا يطابق. ابدأ الربط من جديد.", true);
  }
  const code = params.get("code");
  if (!code) return page(400, "لم يكتمل الربط من تيك توك. ابدأ الربط من جديد.", true);

  try {
    const tokens = await exchangeTikTokCode(config, code, fetchImpl);
    if (!tokens.scope.split(",").includes("video.list")) {
      return page(400, "لم تُمنح صلاحية قراءة الفيديوهات (video.list). أعد الربط ووافق عليها.", true);
    }
    const videos = await listTikTokVideos(tokens.accessToken, MAX_HIGHLIGHTS, fetchImpl);
    await saveTikTokConnection(store, tokens.refreshToken, videos);
    revalidateHome();
    return page(200, `تم ربط تيك توك. عدد الفيديوهات الظاهرة الآن: ${videos.length}.`, true);
  } catch (error) {
    console.error("[tiktok] connect failed:", error instanceof Error ? error.message : "unknown error");
    return page(502, "تعذر إكمال الربط مع تيك توك. حاول مرة أخرى لاحقًا.", true);
  }
}
