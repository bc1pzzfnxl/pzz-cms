# AGENTS.md

Repository-level guidance for agents. It adds to the global `AGENTS.md`.

## Project

`pzz-cms` is a light, MDX-first CMS on Astro and Cloudflare Workers. Read
[`PLAN.md`](./PLAN.md) for the decisions and the phase order, and
[`GLOSSARY.md`](./GLOSSARY.md) for the vocabulary.

## Commands

```bash
bun install
bun run dev
bun run check        # Biome + typecheck + tests
bunx wrangler <cmd>  # wrangler only runs through Bun, there is no node binary
```

Never use npm, pnpm or npx. Wrangler's global binary needs `node`, which is not
installed; always call it as `bunx wrangler`.

## Rules

- Code, comments and docs in English. UI copy and article content in the site
  language (French for the reference blog).
- The repository is public. Never commit an article, image, database dump or
  secret. Test fixtures are synthetic.
- Site branding and the canonical URL live in `src/lib/site.ts`, not inline in
  components.
- Keep the blog design in `src/layouts/MainLayout.astro`. Do not run
  `skill-seo-astro init` on this repo: it overwrites `index.astro` and
  `[slug].astro`.
- A change is done only when `bun run check` passes.

## Architecture

- `src/lib/` holds pure helpers (slug, SEO, image meta). Small interfaces, easy
  to test.
- `src/content/` will hold the content module: the only place that talks to D1.
- `src/pages/` holds routes, public and admin.
- `migrations/` holds D1 migrations. Number them in order.

## Astro gotchas

- `trailingSlash: "always"` is on. Endpoint URLs must be called **with** a
  trailing slash (`/admin/api/articles/`), and dynamic rest routes only match
  with one (`/media/<key>/`).
- Astro's CSRF guard rejects cross-origin form POSTs: callers must send a
  same-origin `Origin` header.
- Do not run `skill-seo-astro init` here: it overwrites `index.astro` and
  `[slug].astro`.
- `.astro` files are excluded from Biome (false positives); `astro check` covers
  them. Vendored mdxcn files are excluded too (see `biome.json` overrides).
