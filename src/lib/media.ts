import { slugify } from "./slug";

/** Object key for an uploaded image: `images/<slug>-<random>.webp`. */
export function mediaObjectKey(name: string, random: string): string {
  const base = slugify(name.replace(/\.[^.]+$/, "")) || "image";
  return `images/${base}-${random}.webp`;
}

/**
 * Public URL path for a media object key. Ends with a slash because the site
 * uses `trailingSlash: "always"`; the media route only matches with it.
 */
export function mediaPublicPath(r2Key: string): string {
  return `/media/${r2Key}/`;
}

/** Resized variants generated for an image; the original is kept untouched. */
export const MEDIA_VARIANT_WIDTHS = [480, 800, 1200] as const;

/** `sizes` for images inside the 680px article column. */
export const MEDIA_SIZES = "(max-width: 680px) 100vw, 680px";

/** R2 key for a resized variant: `images/foo-abc@800.webp`. */
export function mediaVariantKey(r2Key: string, width: number): string {
  return r2Key.replace(/(\.[a-z0-9]+)$/i, `@${width}$1`);
}

/** Public path for a resized variant. */
export function mediaVariantPath(r2Key: string, width: number): string {
  return mediaPublicPath(mediaVariantKey(r2Key, width));
}

/** Variant widths smaller than the original. */
export function mediaVariantWidths(width?: number | null): number[] {
  if (!width) return [];
  return MEDIA_VARIANT_WIDTHS.filter((variant) => variant < width);
}

/** `srcset` for an image, with the variants and the original at its own width. */
export function mediaSrcSet(r2Key: string, width?: number | null): string | null {
  if (!width) return null;

  const entries = mediaVariantWidths(width).map(
    (variant) => `${mediaVariantPath(r2Key, variant)} ${variant}w`,
  );
  entries.push(`${mediaPublicPath(r2Key)} ${width}w`);

  return entries.join(", ");
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Media keys referenced by `<img>` tags in an HTML fragment. */
export function mediaKeysInHtml(html: string): string[] {
  const keys = new Set<string>();
  for (const match of html.matchAll(/\/media\/(images\/[^"'\s>]+?)\/?(?=["'\s>])/g)) {
    keys.add(match[1]);
  }
  return [...keys];
}

function mediaKeyFromSrc(src: string): string | null {
  const match = src.match(/\/media\/(images\/[^"'\s>]+?)\/?$/);
  return match ? match[1] : null;
}

/**
 * Add intrinsic dimensions, `srcset`/`sizes`, and lazy loading to body images,
 * so article pages have no layout shift and download the right size.
 * Idempotent: existing attributes are kept.
 */
export function optimizeBodyImages(html: string, dimensions: Map<string, ImageDimensions>): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const key = src ? mediaKeyFromSrc(src) : null;
    const dims = key ? dimensions.get(key) : undefined;

    let out = tag;
    if (dims && key) {
      if (!/\bwidth=/i.test(out)) out = out.replace(/<img\b/i, `<img width="${dims.width}"`);
      if (!/\bheight=/i.test(out)) out = out.replace(/<img\b/i, `<img height="${dims.height}"`);
      if (!/\bsrcset=/i.test(out)) {
        const srcset = mediaSrcSet(key, dims.width);
        if (srcset) out = out.replace(/<img\b/i, `<img srcset="${srcset}" sizes="${MEDIA_SIZES}"`);
      }
    }
    if (!/\bloading=/i.test(out)) out = out.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding=/i.test(out)) out = out.replace(/<img\b/i, '<img decoding="async"');
    return out;
  });
}
