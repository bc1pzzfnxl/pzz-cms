# pzz-cms

A light, MDX-first CMS built on [Astro](https://astro.build/) and Cloudflare
Workers. It stores articles in D1, edits them in an MDX editor, and renders an
SEO-focused blog with server-side rendering.

This project is developed in the open. It is generic: branding and the canonical
URL live in `src/lib/site.ts`, so it can drive any blog.

## Status

Early. Phase P0 (foundation) is complete. See [`PLAN.md`](./PLAN.md) for the
full roadmap.

## Stack

- Astro with the Cloudflare adapter, server-side rendering
- Cloudflare D1 for content, R2 for media
- MDX content, edited with MDXEditor
- Tailwind CSS v4
- Bun, TypeScript strict, Biome, Vitest, Playwright

## Requirements

- [Bun](https://bun.sh/)
- A Cloudflare account (for D1, R2, Access and deployment)

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
selects `passkey` (default), `access`, or `none`. The default is passkeys
(Better Auth), which is portable: it runs on Cloudflare or any Node host.

Register the owner passkey once (there is no signup):

1. set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SETUP_TOKEN`, `OWNER_EMAIL`;
2. open `/admin/setup?token=<SETUP_TOKEN>` and register the passkey;
3. remove `SETUP_TOKEN`.

Recover a lost passkey:

```bash
bun run auth:reset --config wrangler.deploy.jsonc
```

Cloudflare Access stays available as the `access` adapter
(`scripts/wizard-access.sh`).

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

## Data policy

This repository holds code only. Articles, images, database contents and
secrets are never committed. Test fixtures are synthetic.

## License

[MIT](./LICENSE) © bc1pzzfnxl.
