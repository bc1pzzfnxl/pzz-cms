/**
 * Intrinsic dimensions for local images, used to prevent Cumulative Layout Shift.
 *
 * In the CMS, this map is generated from the `media` table (D1): the WebP
 * conversion step records the pixel size of every uploaded image. The static
 * map is kept for images that live in `public/images/` and are not in the
 * database (for example the default cover).
 */
export const imageMetaMap: Record<string, { width: number; height: number }> = {};

export function getImageDimensions(src?: string): { width?: number; height?: number } {
  if (!src) return {};
  try {
    const pathname = src.startsWith("http") ? new URL(src).pathname : src;
    return imageMetaMap[pathname] || {};
  } catch {
    return imageMetaMap[src] || {};
  }
}
