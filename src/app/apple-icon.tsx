import { renderAppleIcon } from "@/lib/brand/share-image";
import { APPLE_ICON_SIZE } from "@/lib/brand/share-image-meta";

export const size = APPLE_ICON_SIZE;
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppleIcon();
}
