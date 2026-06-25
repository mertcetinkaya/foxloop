const PLACEHOLDER_COUNT = 10;

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Deterministic gradient placeholder from a pool of 10 canvas-generated covers. */
export function placeholderCoverForSlug(slug: string): string {
  const idx = (hashSlug(slug) % PLACEHOLDER_COUNT) + 1;
  return `/games/placeholders/${String(idx).padStart(2, "0")}.jpg`;
}

export function resolveGameCoverImage(slug: string, image: string): string {
  if (!image) return placeholderCoverForSlug(slug);
  return image;
}
