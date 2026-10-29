# 0008 — Split the site and the CMS into two apps

- **Status**: accepted
- **Date**: 2026-10-29

## Context

The admin (React + MDXEditor + better-auth + Tailwind) shipped inside the same
Astro app as the public site and was deployed on the same Worker. It enlarged
the public bundle and exposed an auth surface (password sign-in, Cloudflare
Access JWT verification, secrets) on the public internet.

The author works alone and edits from one machine. The content itself already
lives in Cloudflare (D1/R2).

## Decision

Split the repository into bun workspaces:

- `apps/site` (`@pzz-cms/site`) — the public site. The **only deployable app**.
- `apps/cms` (`@pzz-cms/cms`) — the admin. **Never deployed**; it runs locally
  with `wrangler dev --remote` and writes directly to the production D1/R2.
- `packages/core` (`@pzz-cms/core`) — the shared content module, helpers and
  MDX components.

All auth is removed — better-auth, jose, Access JWT, login/setup/password pages,
secrets — "as if it had never existed". Localhost is the security boundary.

Builds are split by command, not by flag inside one app:

- `bun run build:site` / `bun run build:cms`
- `bun run dev` (site on a local D1) / `bun run dev:cms` (admin on `--remote`)

Turborepo was considered and deferred: at two apps plus one package, bun's
`--filter` already gives parallel, dependency-ordered execution, while turbo's
cache wins need more contributors and packages (see
`docs/research/turborepo.md`).

## Consequences

- The public Worker shrinks to Astro + D1/R2 + Tailwind; React, the editor and
  auth leave its bundle. No auth routes, no secrets.
- Editing requires the author's machine with Cloudflare auth (wrangler login).
  Remote editing is gone.
- The deployment repository (`bc1pzzfnxl-blog`) contains `apps/site` +
  `packages/core` only; never `apps/cms` (`docs/template-vs-blog.md`).
- Better-auth tables (`user`, `session`, `account`, `verification`) are dropped
  from production D1 and the `AUTH_*`/`BETTER_AUTH_*` secrets removed at cutover
  (runbook in `docs/backup.md`).
- CI covers both apps; the CMS e2e runs against a local D1, never `--remote`.
- Supersedes ADR 0003 (Cloudflare Access) and ADR 0007 (passkey auth).

See `docs/spec/split-site-cms.md` for the full plan.
