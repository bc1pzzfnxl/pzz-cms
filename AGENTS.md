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
  components. `astro.config.mjs`, `robots.txt` and `llms.txt` read it.
- `pzz-cms` is the upstream template; the blog is a deployment. Never copy a
  deployment's `site.ts`, Wrangler config, secrets, content or generated assets
  into the template. See `docs/template-vs-blog.md`.
- Keep the blog design in `src/layouts/MainLayout.astro`. Do not run
  `skill-seo-astro init` on this repo: it overwrites `index.astro` and
  `[slug].astro`.
- A change is done only when `bun run check` passes.

## Architecture

- `src/lib/` holds pure helpers (slug, SEO, image meta). Small interfaces, easy
  to test.
- `src/content/` holds the content module: the only place that talks to D1.
- `src/pages/` holds routes, public and admin.
- `migrations/` holds D1 migrations. Number them in order.

## Astro gotchas

- Page URLs are canonical with a trailing slash. `trailingSlash` is `"ignore"`
  so the Better Auth routes under `/api/auth` are not redirected; a middleware
  canonicalization step 301s page URLs that lack the slash. Call endpoints with
  the trailing slash (`/admin/api/articles/`); the media route strips it.
- Astro's CSRF guard rejects cross-origin form POSTs: callers must send a
  same-origin `Origin` header.
- Do not run `skill-seo-astro init` here: it overwrites `index.astro` and
  `[slug].astro`.
- `.astro` files are excluded from Biome (false positives); `astro check` covers
  them. Vendored mdxcn files are excluded too (see `biome.json` overrides).
