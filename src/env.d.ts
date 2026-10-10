/**
 * Cloudflare bindings used by the app. Declared by hand so the project does not
 * depend on `wrangler types` (which needs network access). Widen this as
 * bindings are added (R2, KV, …).
 */
declare module "cloudflare:workers" {
  export const env: {
    DB: import("./content/types").Database;
    MEDIA: import("./lib/r2").R2BucketLike;
  };
}
