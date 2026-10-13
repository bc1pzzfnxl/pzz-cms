# ADR 0007 — Passkey auth behind a provider seam

## Status

Accepted. Supersedes [ADR 0003](./0003-cloudflare-access-for-admin.md).

## Context

The admin was protected by Cloudflare Access (ADR 0003). Access is edge-only:
a self-hoster on a Raspberry Pi or any non-Cloudflare host cannot use it, which
works against the project being a portable, open-source CMS.

Better Auth is an embeddable TypeScript auth library (MIT). Its passkey plugin
(SimpleWebAuthn underneath) supports Cloudflare D1 through a Kysely dialect, so
passkeys can be served from the same Worker and database as the content.

## Decision

Authenticate at the application level, behind a small **auth seam**
(`AuthProvider`: `getSession`, `handle`) with three adapters:

- `passkey` (default): Better Auth + `@better-auth/passkey`, sessions in D1.
- `access`: reads Cloudflare Access headers, kept as an option for Cloudflare
  deployments.
- `none`: local development only.

The owner registers the first passkey through a one-shot `/admin/setup` route
guarded by `SETUP_TOKEN`; there is no signup. Sessions last 30 days. Recovery is
`scripts/auth-reset.ts`, run against the owner's Cloudflare account.

## Consequences

- The CMS is portable: the same code runs on Cloudflare or any Node host with a
  SQLite/Postgres database behind the seam.
- More code than Access, but it does not tie deployments to Cloudflare.
- `trailingSlash` is `"ignore"` with a canonical redirect in middleware: Astro
  emits the trailing-slash redirect before middleware, which would break the
  Better Auth routes under `/api/auth`.
