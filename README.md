# pzz-cms

A light, MDX-first CMS built on [Astro](https://astro.build/) and Cloudflare
Workers. It stores articles in D1, edits them in an MDX editor, and renders an
SEO-focused blog with server-side rendering.

This project is developed in the open. It is generic: branding, the canonical
URL and the default metadata live in `src/lib/site.ts`, so the same code can
drive any blog. See [`docs/template-vs-blog.md`](./docs/template-vs-blog.md) for
the boundary between the template and a deployment.

## Status

The reference blog runs on this engine in production. Phases P0–P7 are done;
P8 (optional editorial components) is partial. See [`PLAN.md`](./PLAN.md) for the
history and the open points.

## Stack

- Astro with the Cloudflare adapter, server-side rendering
- Cloudflare D1 for content, R2 for media
- MDX content, edited with MDXEditor
- Tailwind CSS v4
- Bun, TypeScript strict, Biome, Vitest, Playwright

## Requirements

- [Bun](https://bun.sh/)
- A Cloudflare account for D1, R2 and deployment (Cloudflare Access is optional;
  the default admin auth is a password)

Node and npm are not required. Wrangler runs through Bun.

## Development

```bash
bun install
bun run dev          # Astro dev server on http://localhost:4321
```

`astro dev` runs the Cloudflare Vite plugin on the real `workerd` runtime. If
your environment blocks `workerd` (some sandboxes do), fall back to
`bun run build` plus the checks below.

## Checks

```bash
bun run check        # Biome + Astro typecheck + Vitest
bun run lint         # Biome only
bun run typecheck    # Astro check
bun run test         # Vitest
bun audit            # dependency audit; must stay clean
```

## Deployment

```bash
bun run deploy       # astro build && wrangler deploy
```

`wrangler.jsonc` is a template. Fill in your own D1 and R2 IDs before deploying.

For a real deployment, keep the template untouched and use a local, gitignored
`wrangler.deploy.jsonc` with your own IDs:

```bash
bun run build
bunx wrangler deploy --config wrangler.deploy.jsonc
```

### Cloudflare Workers Builds

If you use Workers Builds, set the `BUN_VERSION` build variable to `1.4.3` (or
`latest`). The build image ships Bun 1.2, which cannot read the `bun.lock`
lockfile (lockfileVersion 2).

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

## Authentication

The admin (`/admin`) is protected in-app by a small auth seam. `AUTH_PROVIDER`
selects `password` (default), `access`, or `none`. Password auth uses Better
Auth (email/password, hashed in D1); it is portable and works everywhere.

First install (there is no signup):

1. set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SETUP_TOKEN`, `OWNER_EMAIL`;
2. open `/admin/setup?token=<SETUP_TOKEN>` and **choose your password**;
3. remove `SETUP_TOKEN`.

Change the password at `/admin/password` (current + new; keeps the session).
Recovery: `bun run auth:reset`, then open the setup URL again.

Cloudflare Access stays available as the `access` adapter.

## Migration

Import an existing Markdown blog into D1:

```bash
bun run migrate ../your-blog/src/content   # writes migration-output/ (gitignored)
bunx wrangler d1 execute DB --remote --config wrangler.deploy.jsonc --file=migration-output/articles.sql
bunx wrangler d1 execute DB --remote --config wrangler.deploy.jsonc --file=migration-output/media.sql
bash migration-output/r2-upload.sh
```

Compare the old blog and the CMS, URL by URL:

```bash
bun run parity https://example.com https://your-worker.workers.dev /sitemap-index.xml
```

## Content mirror

Keep a Git history of the text content, without storing images:

```bash
bun run content:sync -- --config=wrangler.deploy.jsonc
bun run content:import -- --config=wrangler.deploy.jsonc
bun run media:gc -- --bucket=<r2-bucket> --config=wrangler.deploy.jsonc
```

`content:sync` mirrors published articles by default; `--all` includes drafts
and requires a private repository. `content:import` restores text and media
metadata into D1; R2 objects are not backed up. See
[`docs/template-vs-blog.md`](./docs/template-vs-blog.md) and
[`docs/backup.md`](./docs/backup.md).

## Data policy

This repository holds code only. Articles, images, database contents and
secrets are never committed. Test fixtures are synthetic.

## License

[MIT](./LICENSE) © bc1pzzfnxl.
