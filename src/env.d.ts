/**
 * Cloudflare bindings and environment used by the app. Declared by hand so the
 * project does not depend on `wrangler types` (which needs network access).
 * Widen this as bindings are added.
 */
declare module "cloudflare:workers" {
  export const env: {
    DB: import("./content/types").Database;
    MEDIA: import("./lib/r2").R2BucketLike;
    /** Auth provider: "passkey" (default), "access", or "none". */
    AUTH_PROVIDER?: "passkey" | "access" | "none";
    /** Better Auth secret (>= 32 chars). */
    BETTER_AUTH_SECRET?: string;
    /** Canonical origin for Better Auth, e.g. https://example.com. */
    BETTER_AUTH_URL?: string;
    /** One-shot token that allows registering the first passkey. */
    SETUP_TOKEN?: string;
    /** Owner email for the single account. */
    OWNER_EMAIL?: string;
  };
}

declare namespace App {
  interface Locals {
    session?: import("./auth/types").AuthSession;
  }
}
