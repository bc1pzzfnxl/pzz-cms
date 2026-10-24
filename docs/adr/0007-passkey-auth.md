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
  sessions in D1, 7 days with a 1-day rolling refresh.
- `access`: reads Cloudflare Access headers, kept as an option for Cloudflare
  deployments.
- `none`: local development only.

There is no signup. The owner chooses their password once at `/admin/setup`,
guarded by `SETUP_TOKEN`; the password is hashed by Better Auth and stored in
D1, so no password secret is involved. A database hook refuses any second
account. The password is changed at `/admin/password` (current + new, keeps the
session). Recovery is `scripts/auth-reset.ts`, run against the owner's
Cloudflare account.

## Consequences

- The CMS is portable: the same code runs on Cloudflare or any Node host with a
  SQLite/Postgres database behind the seam.
- No password secret to manage; the only secrets are `BETTER_AUTH_SECRET` and
  the one-shot `SETUP_TOKEN`.
- Losing the password means a reset (deletes the account) and a new setup.
- `trailingSlash` is `"ignore"` with a canonical redirect in middleware: Astro
  emits the trailing-slash redirect before middleware, which would break the
  Better Auth routes under `/api/auth`.
