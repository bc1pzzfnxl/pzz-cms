/**
 * Cloudflare bindings and environment used by the local CMS. Same bindings as
 * the site: the CMS writes to the production D1/R2 through `wrangler dev
 * --remote`.
 */
declare module "cloudflare:workers" {
  export const env: {
    DB: import("@pzz-cms/core").Database;
    MEDIA: import("@pzz-cms/core").R2BucketLike;
  };
}
