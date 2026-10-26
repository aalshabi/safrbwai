/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 * - Fonts are self-hosted by next/font at build time (served from /_next),
 *   so no external font hosts are needed.
 * - Supabase auth/data needs connect-src to *.supabase.co (+ wss for realtime).
 * - Next.js injects inline bootstrap/JSON-LD; without a nonce pipeline we allow
 *   'unsafe-inline' for scripts/styles. 'unsafe-eval' is added ONLY in dev
 *   (React Fast Refresh / dev overlay) and never in production.
 * - 'wasm-unsafe-eval' lets the on-device image reader (tesseract.js, loaded
 *   from /ocr on this site) compile WebAssembly. It does not allow JavaScript
 *   eval.
 * - OAuth (Supabase → Google) is a top-level navigation, not restricted here.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws: http://localhost:*" : ""}`,
  "manifest-src 'self'",
  // Official X / TikTok embeds on the homepage, mounted only after a click.
  "frame-src 'self' https://platform.twitter.com https://www.tiktok.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
