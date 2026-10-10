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
 * Add intrinsic dimensions (from the media table) and lazy loading to body
 * images, so article pages have no layout shift. Idempotent: existing
 * attributes are kept.
 */
export function optimizeBodyImages(html: string, dimensions: Map<string, ImageDimensions>): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    const key = src ? mediaKeyFromSrc(src) : null;
    const dims = key ? dimensions.get(key) : undefined;

    let out = tag;
    if (dims) {
      if (!/\bwidth=/i.test(out)) out = out.replace(/<img\b/i, `<img width="${dims.width}"`);
      if (!/\bheight=/i.test(out)) out = out.replace(/<img\b/i, `<img height="${dims.height}"`);
    }
    if (!/\bloading=/i.test(out)) out = out.replace(/<img\b/i, '<img loading="lazy"');
    if (!/\bdecoding=/i.test(out)) out = out.replace(/<img\b/i, '<img decoding="async"');
    return out;
  });
}
