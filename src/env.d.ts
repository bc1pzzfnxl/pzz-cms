/**
 * Cloudflare bindings and environment used by the app. Declared by hand so the
 * project does not depend on `wrangler types` (which needs network access).
 * Widen this as bindings are added.
 */
declare module "cloudflare:workers" {
  export const env: {
    DB: import("./content/types").Database;
    MEDIA: import("./lib/r2").R2BucketLike;
    /** Auth provider: "password" (default), "access", or "none" (development only). */
    AUTH_PROVIDER?: "password" | "access" | "none";
    /** Cloudflare Access team domain, e.g. team.cloudflareaccess.com. */
    ACCESS_TEAM_DOMAIN?: string;
    /** Cloudflare Access application audience tag. */
    ACCESS_AUD?: string;
    /** Override the Access JWKS URL (tests or a custom deployment). */
    ACCESS_CERTS_URL?: string;
    /** Better Auth secret (>= 32 chars). */
    BETTER_AUTH_SECRET?: string;
    /** Canonical origin for Better Auth, e.g. https://example.com. */
    BETTER_AUTH_URL?: string;
    /** One-shot token that allows creating the first owner account. */
    SETUP_TOKEN?: string;
    /** Owner email for the single account. */
    OWNER_EMAIL?: string;
    /** Max sign-in attempts per minute per IP (default 5). */
    AUTH_SIGNIN_MAX?: string;
  };
}

declare namespace App {
  interface Locals {
    session?: import("./auth/types").AuthSession;
  }
}
