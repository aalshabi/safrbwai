import { SAFRBWAI_URL } from "@/lib/result-actions/format-questions";

/**
 * The public site origin used for canonical links, the sitemap, and robots.txt.
 * Falls back to the production domain, never to localhost, so indexed URLs
 * stay correct even if NEXT_PUBLIC_SITE_URL is missing in an environment.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || SAFRBWAI_URL;
