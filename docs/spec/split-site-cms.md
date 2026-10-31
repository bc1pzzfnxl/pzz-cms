# Split site / CMS — spec

Decision taken 2026-10-29 by grilling. Implements the "public site on Workers,
CMS local-only" model.

## Goal

- The public site is the only deployable artifact: an Astro app reading D1/R2.
- The CMS (admin) runs **locally** with `wrangler dev --remote`, writing
  directly to production D1/R2. It is never deployed.
- Auth disappears entirely ("as if it never existed"): better-auth, jose,
  Access JWT, login/setup/password, `AUTH_*`/`BETTER_AUTH_*` all removed.
- Build time and security surface of the public Worker shrink accordingly
  (React, Tailwind, editor and auth leave the site bundle).

## Non-goals

- Turborepo: researched and deferred (`docs/research/turborepo.md`). Bun
  workspaces + `bun --filter` only. Revisit when the monorepo grows.
- Stats/SEO/tracking dashboards: later. Collection will live on the public
  Worker (GA or a JSON beacon); the local CMS will only display.
- Remote editing: dropped. Editing happens on the author's machine.

## Target structure

```
pzz-cms/
├── apps/
│   ├── site/              # @pzz-cms/site — public site, deployed
│   └── cms/               # @pzz-cms/cms — admin, local only
├── packages/
│   └── core/              # @pzz-cms/core — content module + shared lib + mdx components
├── migrations/            # D1 migrations (root, unchanged)
├── scripts/               # content-sync, content-import, media-gc, migrate, parity,
│                          # optimize-images, seed.sql  (auth-reset.ts and wizard-access.sh removed)
├── tests/                 # root: unit + e2e, split into site/ cms/ core/ projects
└── docs/                  # ADRs, runbooks, spec, research
```

## App contents

- **apps/site/src**: public pages (`index`, `[slug]`, `categorie/[slug]`,
  `auteur`, sitemap*, `rss.xml`, `robots.txt`, `llms.txt`, `404`),
  `MainLayout.astro`, `middleware.ts` (security headers + trailing-slash
  canonicalization only), `styles/global.css`. No admin, no auth, no React.
- **apps/cms/src**: `admin/**` pages + API (minus `login`, `password`, `setup`
  and `api/setup`), `AdminLayout.astro`, `components/admin/**`,
  `styles/admin.css`, the `media/[...key]` route (serves R2 images for the
  editor preview). No auth.
- **packages/core/src**: `content/**`, `lib/**`, mdx components
  (`components/**`), `types`. Deps: `@mdx-js/mdx`, `remark-gfm` (+ Cloudflare
  workers types).

## Commands (the "flags")

| Command                        | Effect                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `bun run build:site`           | Builds the site app only — the only deployable build                 |
| `bun run build:cms`            | Builds the CMS app (verification only, never deployed)               |
| `bun run dev:cms`              | `wrangler dev --remote` in `apps/cms` → writes to production D1/R2   |
| `bun run dev`                  | Site dev server on a **local** D1 (template work without Cloudflare) |
| `bun run check`                | lint + typecheck + unit tests across all packages                    |
| `bun run test` / `bun run e2e` | Unit / e2e, per project (`--project site                             | cms | core`) |

## Data & security

- Content stays in Cloudflare. The local CMS reads/writes production D1/R2 via
  `wrangler dev --remote` (Cloudflare-first, wrangler-first).
- D1 Time Travel remains the safety net (7 days).
- Worker bindings: `DB` + `MEDIA` only. No secrets, no vars on the site Worker.
- The CMS app has no auth: localhost is the boundary.

## Deployment repo (bc1pzzfnxl-blog)

Syncs `apps/site` + `packages/core` + `migrations/` + `scripts/` + root
`package.json`/lockfile + docs. Never `apps/cms`. `template-vs-blog.md`
rewritten accordingly.

## CI

- **site job**: lint + typecheck + unit (site/core) + `build:site` + workerd
  smoke + e2e site.
- **cms job**: lint + typecheck + unit (cms) + `build:cms` + e2e admin against
  a **local** D1 (`wrangler dev` local mode, never `--remote` in CI).

## Cutover order

1. Monorepo lands in the template, `bun run check` green.
2. Blog repo adapted (sync `apps/site` + `packages/core`).
3. Verify `dev:cms --remote` against production D1 in read-only mode.
4. Deploy the new site Worker (admin routes disappear from production).
5. Drop better-auth tables (`user`, `session`, `account`, `verification`) from
   production D1 and remove the `AUTH_*`/`BETTER_AUTH_*` secrets from the
   Worker (documented in `docs/backup.md`).

## Documentation

ADR 0008 (this decision), `PLAN.md`, `README.md`, `template-vs-blog.md`,
`backup.md` (+ auth-drop runbook), `GLOSSARY.md`, `AGENTS.md`,
`CONTRIBUTING.md`. ADRs 0003 (Access) and 0007 (passkey auth) are marked
superseded.
