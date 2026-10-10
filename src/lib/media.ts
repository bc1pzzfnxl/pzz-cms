import { slugify } from "./slug";

/** Object key for an uploaded image: `images/<slug>-<random>.webp`. */
export function mediaObjectKey(name: string, random: string): string {
  const base = slugify(name.replace(/\.[^.]+$/, "")) || "image";
  return `images/${base}-${random}.webp`;
}

/** Public URL path for a media object key. */
export function mediaPublicPath(r2Key: string): string {
  return `/media/${r2Key}`;
}
