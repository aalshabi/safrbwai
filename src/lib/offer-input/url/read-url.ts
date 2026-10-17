/**
 * Reads an offer link for review: link check, then the public page's text.
 * Server-side only (node:http). The result, like a PDF's or an image's text,
 * goes to the text field for the user to review before analysis.
 */

import { OFFER_LIMITS } from "../types";
import { normalizeExtractedText } from "../pdf-text";
import { fetchPublicPage, type FetchOptions, type FetchRefusal } from "./fetch-page";
import { htmlToPageText } from "./html-text";
import { checkLink, type LinkSignal } from "./link-check";

export type ReadUrlRefusal = FetchRefusal | "no_text" | "too_long";

export type ReadUrlResult =
  | { ok: true; text: string; finalUrl: string; signals: LinkSignal[] }
  | { ok: false; reason: ReadUrlRefusal; signals: LinkSignal[] };

export async function readOfferUrl(
  rawUrl: string,
  options: FetchOptions & { fetchPage?: typeof fetchPublicPage } = {}
): Promise<ReadUrlResult> {
  const { fetchPage = fetchPublicPage, ...fetchOptions } = options;
  const page = await fetchPage(rawUrl, fetchOptions);
  const signals = checkLink(rawUrl, page.finalUrl);
  if (!page.ok) return { ok: false, reason: page.reason, signals };

  const raw = /^text\/plain/i.test(page.contentType) ? page.body : htmlToPageText(page.body).text;
  const text = normalizeExtractedText(raw);
  // Pages that build their content with JavaScript arrive nearly empty.
  if (text.replace(/\s/g, "").length < OFFER_LIMITS.textMin) return { ok: false, reason: "no_text", signals };
  // Never truncated: a cut could drop an exclusion such as «غير شامل الطيران».
  if (text.length > OFFER_LIMITS.textMax) return { ok: false, reason: "too_long", signals };
  return { ok: true, text, finalUrl: page.finalUrl, signals };
}
