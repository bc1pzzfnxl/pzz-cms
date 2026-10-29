/**
 * Cloudflare bindings and environment used by the site app. Declared by hand
 * so the project does not depend on `wrangler types` (which needs network
 * access). Widen this as bindings are added.
 */
declare module "cloudflare:workers" {
  export const env: {
    DB: import("@pzz-cms/core").Database;
    MEDIA: import("@pzz-cms/core").R2BucketLike;
  };
}
