# ADR 0007 — Password auth behind a provider seam

## Status

Accepted. Supersedes [ADR 0003](./0003-cloudflare-access-for-admin.md).

## Context

The admin was protected by Cloudflare Access (ADR 0003). Access is edge-only:
a self-hoster on a Raspberry Pi or any non-Cloudflare host cannot use it, which
works against the project being a portable, open-source CMS.

Passkeys (WebAuthn) were evaluated and dropped: a meaningful share of machines
have no usable authenticator, and requiring one locks the owner out. A password
works everywhere.

Better Auth is an embeddable TypeScript auth library (MIT) with email/password
support and a Cloudflare D1 dialect, so credentials can be served from the same
Worker and database as the content.

## Decision

Authenticate at the application level, behind a small **auth seam**
(`AuthProvider`: `getSession`, `handle`) with three adapters:

- `passkey` is gone; the default is `password` (Better Auth email/password),
  sessions in D1, 30 days.
- `access`: reads Cloudflare Access headers, kept as an option for Cloudflare
  deployments.
- `none`: local development only.

There is no signup. The owner account is seeded once from `OWNER_EMAIL` and
`ADMIN_PASSWORD` through the one-shot `/admin/setup` route, guarded by
`SETUP_TOKEN`; a database hook refuses any second account. Recovery is
`scripts/auth-reset.ts`, run against the owner's Cloudflare account.

## Consequences

- The CMS is portable: the same code runs on Cloudflare or any Node host with a
  SQLite/Postgres database behind the seam.
- The password is hashed in D1 by Better Auth; `ADMIN_PASSWORD` is only used to
  seed the account, so changing the secret alone does not change the password.
- `trailingSlash` is `"ignore"` with a canonical redirect in middleware: Astro
  emits the trailing-slash redirect before middleware, which would break the
  Better Auth routes under `/api/auth`.
