# T2 — Site app

## Status: todo

## Blocking edges: T1

## Goal
`apps/site` becomes the full public site: same routes, same rendering, no
admin, no auth, no React.

## Work
1. Move into `apps/site/src`: `pages/{index.astro,[slug].astro,categorie,auteur.astro,404.astro,sitemap.xml.ts,sitemap-index.xml.ts,rss.xml.ts,robots.txt.ts,llms.txt.ts,media/[...key].ts}`, `layouts/MainLayout.astro`, `styles/global.css`.
2. `middleware.ts`: keep security headers + trailing-slash canonicalization;
   remove `/api/auth` handling and the admin guard.
3. `astro.config.mjs` for site: no `@astrojs/react`, no Tailwind plugin;
   keep `astro-icon`, `@astrojs/cloudflare`; alias `@` → `apps/site/src`;
   keep the `debug` mock alias if still needed (check usage).
4. `apps/site/package.json`: deps = `astro`, `@astrojs/cloudflare`,
   `@astrojs/rss`, `astro-icon`, `@fontsource-variable/geist`,
   `@fontsource/geist-mono`, `@iconify-json/heroicons-solid`, `@pzz-cms/core`.
   No react, no tailwind, no better-auth, no jose.
5. `apps/site/wrangler.jsonc`: bindings `DB` + `MEDIA` (template placeholders),
   same compatibility flags as today.
6. Public pages import from `@pzz-cms/core` (content module, seo, site,
   media helpers) and local `@/` for layouts/components.

## Done when
- `bun run build:site` builds; `bun run dev` serves the home with a local D1
  seeded by `scripts/seed.sql`; existing site e2e (home-preview) passes;
  `/admin/*` and `/api/auth` 404.
