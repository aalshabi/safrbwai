import { renderShareImage } from "@/lib/brand/share-image";
import { SHARE_IMAGE_ALT, SHARE_IMAGE_SIZE } from "@/lib/brand/share-image-meta";

export const alt = SHARE_IMAGE_ALT;
export const size = SHARE_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderShareImage();
}
