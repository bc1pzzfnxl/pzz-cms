# T4 — Auth purge

## Status: done

## Blocking edges: T2, T3

## Goal
Remove every trace of auth from code, CI, and production — "as if it never
existed".

## Work
1. Delete `src/auth/**`, `src/components/auth/**` (already not copied into
   apps), `scripts/auth-reset.ts`, `scripts/wizard-access.sh`.
2. Remove `better-auth`, `jose` from all package manifests; delete
   `AUTH_*`/`ACCESS_*`/`BETTER_AUTH_*` entries from `env.d.ts` files and any
   remaining references (`grep -ri` across the repo must come back empty,
   except docs marked superseded).
3. Update `tests/`: delete `auth.test.ts` and the auth e2e spec; strip auth
   steps from admin specs (login page gone).
4. CI: remove `SETUP_TOKEN`, `ADMIN_PASSWORD`, `OWNER_EMAIL`,
   `AUTH_PROVIDER`, `BETTER_AUTH_*` vars and the auth setup steps.
5. Production runbook (documented, executed at cutover in T7):
   - `DROP TABLE IF EXISTS user; DROP TABLE IF EXISTS session; DROP TABLE IF EXISTS account; DROP TABLE IF EXISTS verification;` against the prod D1.
   - Remove `AUTH_*`/`BETTER_AUTH_*`/`SETUP_TOKEN`/`OWNER_EMAIL` secrets from
     the Worker (wrangler secret delete).
6. Mark `docs/adr/0003-cloudflare-access-for-admin.md` and
   `docs/adr/0007-passkey-auth.md` as superseded (add a header line pointing
   to ADR 0008).

## Done when
- `grep -ri "better-auth\|AUTH_PROVIDER\|ACCESS_AUD" apps packages scripts tests .github` is empty (docs excepted).
- `bun run check` green.
