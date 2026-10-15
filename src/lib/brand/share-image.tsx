import { ImageResponse } from "next/og";
import { APPLE_ICON_SIZE, NAVY, SHARE_IMAGE_SIZE, TEAL } from "./share-image-meta";

/**
 * Share card for og:image and twitter:image, and the iOS home-screen icon.
 *
 * The card text is Latin on purpose: the image renderer does not shape Arabic
 * (letters come out unjoined and left-to-right), and a broken Arabic brand
 * name on every shared link is worse than none. The Arabic title and
 * description still travel in the og:/twitter: text tags.
 */

/** The site logo's compass mark (src/components/shared/logo.tsx), scaled. */
function CompassMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={TEAL} strokeWidth="1.8" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke={TEAL} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8.5l2.4 5.6L12 13l-2.4 1.1L12 8.5z" fill={TEAL} />
    </svg>
  );
}

export function renderShareImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: NAVY,
          color: "#FFFFFF",
        }}
      >
        <CompassMark size={120} />
        <div style={{ display: "flex", marginTop: 40, fontSize: 96 }}>SafrBwai</div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 44, color: "#CBD5E1" }}>
          Review travel offers before you book
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 32, color: TEAL }}>safrbwai.com</div>
      </div>
    ),
    SHARE_IMAGE_SIZE
  );
}

export function renderAppleIcon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: NAVY,
        }}
      >
        <CompassMark size={112} />
      </div>
    ),
    APPLE_ICON_SIZE
  );
}
