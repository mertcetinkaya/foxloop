import sharp from "sharp";

const COVER_W = 1200;
const COVER_H = 750;

export interface SdkReferenceImage {
  buffer: Buffer;
  mimeType: string;
}

/** Resize any uploaded image to catalog cover JPEG dimensions. */
export async function normalizeUploadToCoverJpeg(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .resize(COVER_W, COVER_H, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export function toSdkReferenceImage(
  buffer: Buffer,
  mime = "image/jpeg"
): SdkReferenceImage {
  const mimeType =
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp" ||
    mime === "image/gif"
      ? mime
      : "image/jpeg";
  return { buffer, mimeType };
}

export function referenceImagePayload(ref: SdkReferenceImage): {
  data: string;
  mimeType: string;
} {
  return {
    data: ref.buffer.toString("base64"),
    mimeType: ref.mimeType,
  };
}
