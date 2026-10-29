# AGENTS.md

Repository-level guidance for agents. It adds to the global `AGENTS.md`.

## Project

`pzz-cms` is a light, MDX-first CMS on Astro and Cloudflare Workers, split into
a deployable public site and a local-only admin (bun workspaces). Read
[`PLAN.md`](./PLAN.md) for the decisions and the phase order,
[`GLOSSARY.md`](./GLOSSARY.md) for the vocabulary, and
[`docs/spec/split-site-cms.md`](./docs/spec/split-site-cms.md) for the layout.

## Layout

- `apps/site/` — public site (the only deployable app)
- `apps/cms/` — local admin; runs with `wrangler dev --remote`, never deployed
- `packages/core/` — shared content module, libs, MDX components
- `migrations/` — D1 migrations (reachable from both apps via symlinks)
- `scripts/` — content-sync, content-import, media-gc, migrate, parity,
  optimize-images
- `tests/` — unit + e2e, split into `site/`, `cms/`, helpers

## Commands

```bash
bun install
bun run dev            # public site, local D1
bun run dev:cms        # admin against production D1/R2 (wrangler dev --remote)
bun run build:site     # the only deployable build
bun run build:cms      # admin build, verification only
bun run check          # Biome + typecheck (both apps) + Vitest
bunx wrangler <cmd>    # wrangler only runs through Bun, there is no node binary
```

Never use npm, pnpm or npx. Wrangler's global binary needs `node`, which is not
installed; always call it as `bunx wrangler`.

Note: `bunx wrangler dev` cannot serve requests under old Bun (1.4.x, undici
dispatcher issue). CI uses `bun: latest`. Run local e2e with a recent Bun, or
let CI validate it.

## Rules

- Code, comments and docs in English. UI copy and article content in the site
  language (French for the reference blog).
- The repository is public. Never commit an article, image, database dump or
  secret. Test fixtures are synthetic.
- Site branding and the canonical URL live in `packages/core/src/lib/site.ts`,
  not inline in components. `astro.config.mjs` (site), `robots.txt` and
  `llms.txt` read it.
- `pzz-cms` is the upstream template; the blog is a deployment. Never copy a
  deployment's `site.ts`, Wrangler config, secrets, content or generated assets
  into the template. The deployment only ever syncs `apps/site` +
  `packages/core` — never `apps/cms`. See `docs/template-vs-blog.md`.
- There is no auth: do not reintroduce one without an ADR. The CMS is
  localhost-only.
- Keep the blog design in `apps/site/src/layouts/MainLayout.astro`. Do not run
  `skill-seo-astro init` on this repo: it overwrites `index.astro` and
  `[slug].astro`.
- A change is done only when `bun run check` passes.

## Architecture

- `packages/core/src/lib/` holds pure helpers (slug, SEO, media). Small
  interfaces, easy to test.
- `packages/core/src/content/` holds the content module: the only place that
  talks to D1.
- `apps/site/src/pages/` holds public routes; `apps/cms/src/pages/admin/` the
  admin. The `media/[...key]` route exists in both apps (site serves images,
  the CMS serves editor previews).
- `migrations/` holds D1 migrations. Number them in order.

## Astro gotchas

- Page URLs are canonical with a trailing slash. `trailingSlash` is `"ignore"`,
  and the site middleware 301s page URLs that lack the slash. Call admin
  endpoints with the trailing slash (`/admin/api/articles/`); the media route
  strips it.
- Astro's CSRF guard rejects cross-origin form POSTs: callers must send a
  same-origin `Origin` header.
- Do not run `skill-seo-astro init` here: it overwrites `index.astro` and
  `[slug].astro`.
- `.astro` files are excluded from Biome (false positives); `astro check` covers
  them. Vendored mdxcn files are excluded too (see `biome.json` overrides).
