# pzz-cms

A light, MDX-first CMS built on [Astro](https://astro.build/) and Cloudflare
Workers. It stores articles in D1, edits them in an MDX editor, and renders an
SEO-focused blog with server-side rendering.

This project is developed in the open. It is generic: branding, the canonical
URL and the default metadata live in `packages/core/src/lib/site.ts`, so the
same code can drive any blog. See [`docs/template-vs-blog.md`](./docs/template-vs-blog.md) for
the boundary between the template and a deployment.

## Model: deployed site, local CMS

The repository is a bun-workspaces monorepo:

| Package | Role |
| --- | --- |
| `apps/site` (`@pzz-cms/site`) | The public site. The **only deployable app**. |
| `apps/cms` (`@pzz-cms/cms`) | The admin. **Never deployed**: it runs locally and writes directly to the production D1/R2. |
| `packages/core` (`@pzz-cms/core`) | The shared content module, helpers and MDX components. |

There is no authentication: the CMS runs on localhost, which is the security
boundary. The public Worker exposes no admin routes, no auth routes and no
secrets. See [`docs/adr/0008-split-site-cms.md`](./docs/adr/0008-split-site-cms.md) and
[`docs/spec/split-site-cms.md`](./docs/spec/split-site-cms.md).

## Stack

- Astro with the Cloudflare adapter, server-side rendering
- Cloudflare D1 for content, R2 for media
- MDX content, edited with MDXEditor (CMS app only)
- Tailwind CSS v4
- Bun, TypeScript strict, Biome, Vitest, Playwright

## Requirements

- [Bun](https://bun.sh/) ≥ 1.4
- [Node.js](https://nodejs.org/) — only to run the local CMS dev server
  (`wrangler dev` cannot run under Bun; see AGENTS.md)
- A Cloudflare account for D1, R2 and deployment
- For the local CMS: a `wrangler` login on your machine (`bunx wrangler login`)

Node and npm are otherwise not required. One-shot wrangler commands run
through Bun (`bunx wrangler`).

## Development

```bash
bun install
bun run dev            # public site on a local D1 (http://localhost:4321)
bun run dev:cms        # admin on wrangler dev --remote → production D1/R2
```

`dev:cms` writes to the real production database: use it for editing, never for
experiments. There is no admin on the deployed site.

## Checks

```bash
bun run check          # Biome + Astro typecheck (both apps) + Vitest
bun run lint           # Biome only
bun run typecheck      # astro check for site and cms
bun run test           # Vitest
bun run e2e            # Playwright (needs the workers booted; see CI)
bun audit              # dependency audit; must stay clean
```

## Deployment

```bash
bun run deploy         # build:site && wrangler deploy (apps/site/wrangler.jsonc)
```

`apps/site/wrangler.jsonc` is a template. Fill in your own D1 and R2 IDs before
deploying. A deployment repository carries its own gitignored copy with real
IDs (see `docs/template-vs-blog.md`).

### Cloudflare Workers Builds

If you use Workers Builds, set the build command to `bun run build:site` and
the `BUN_VERSION` build variable to `latest`. Older Bun 1.2 images cannot read
the `bun.lock` lockfile.

## R2 cost control

R2's free tier is 10 GB storage, 1M Class A (writes) and 10M Class B (reads)
operations per month. Three things keep usage inside it:

- **Edge caching.** Media responses are stored with the Cache API
  (`caches.default`), so image views are served from Cloudflare's cache, not R2.
  R2 is read at most once per colo per object. Verified: `cf-cache-status: HIT`
  on repeat requests.
- **Upload caps.** Images are converted to WebP in the browser (max 1600 px
  wide) and the upload endpoint rejects anything above 1 MB.
- **Spending limit.** Set a hard cap in the dashboard: **Manage Account →
  Billing → set a spending limit**. Notifications alone do not cap usage.

## Migration

Import an existing Markdown blog into D1:

```bash
bun run migrate ../your-blog/src/content   # writes migration-output/ (gitignored)
bunx wrangler d1 execute DB --remote --config apps/site/wrangler.jsonc --file=migration-output/articles.sql
bunx wrangler d1 execute DB --remote --config apps/site/wrangler.jsonc --file=migration-output/media.sql
bash migration-output/r2-upload.sh
```

Compare the old blog and the CMS, URL by URL:

```bash
bun run parity https://example.com https://your-worker.workers.dev /sitemap-index.xml
```

## Content mirror

Keep a Git history of the text content, without storing images:

```bash
bun run content:sync -- --config=apps/site/wrangler.jsonc
bun run content:import -- --config=apps/site/wrangler.jsonc
bun run media:gc -- --bucket=<r2-bucket> --config=apps/site/wrangler.jsonc
```

`content:sync` mirrors published articles by default; `--all` includes drafts
and requires a private repository. `content:import` restores text and media
metadata into D1. `media:gc` deletes orphaned media after a 7-day grace period.
Recovery and Time Travel procedures: [`docs/backup.md`](./docs/backup.md).
