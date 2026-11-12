# Getting started

From a fresh clone to a live blog with a working local admin. The commands and
conventions here assume the [requirements](../README.md#requirements): Bun ≥ 1.4,
Node.js (only to run the local CMS), and a Cloudflare account.

## 1. Clone and install

```bash
git clone https://github.com/bc1pzzfnxl/pzz-cms.git my-blog && cd my-blog
bun install
bunx wrangler login
```

## 2. Create your Cloudflare resources

Every deployment owns its D1 database and R2 bucket. Create yours and keep the
returned ids:

```bash
bunx wrangler d1 create my-site-db
bunx wrangler r2 bucket create my-site-media
bunx wrangler d1 migrations apply my-site-db --remote
```

## 3. Give the site its identity

- [`packages/core/src/lib/site.ts`](../packages/core/src/lib/site.ts) is the
  single source of branding: name, canonical URL, author, description, default
  metadata. The site's `astro.config.mjs`, `robots.txt`, `llms.txt`, sitemap,
  RSS and JSON-LD all read it.
- `apps/site/wrangler.jsonc` is a template with placeholder ids. Put your real
  D1 id and R2 bucket in a **gitignored copy** (`wrangler.local.jsonc`); the
  build reads it through the adapter's `configPath`. See
  [`ADR 0006`](./adr/0006-real-ids-out-of-public-repo.md).

## 4. Deploy the public site

```bash
bun run deploy    # build:site && wrangler deploy
```

Or use Cloudflare Workers Builds: build command `bun run build:site`, build
variable `BUN_VERSION=latest`. The site goes live, empty of articles. A custom
domain is attached from the dashboard (Worker → Custom Domains).

## 5. Run the local admin

The admin (`apps/cms`) is never deployed. It runs on your machine with
`wrangler dev --remote` and writes straight to the production D1/R2:

1. Copy `apps/cms/wrangler.jsonc` to a gitignored
   `apps/cms/wrangler.local.jsonc` with your real D1 id and R2 bucket, plus the
   public URL of your site as the `SITE_PUBLIC_URL` var (the admin's
   "see the site" link uses it).
2. `bun run dev:cms`, then open `http://localhost:8788/admin/`.

There is no authentication: localhost is the security boundary. Content saved
in the admin appears on the deployed site immediately.

## 6. Write and publish

In the admin: create categories, then articles. Article fields:

- **Slug** — normalized to ASCII kebab-case (accents and apostrophes removed,
  see [`docs/slug.md`](./slug.md) and the glossary). Changing the slug of a
  published article creates a 301 redirect from the old URL automatically.
- **Description (SEO)** — becomes `<meta name="description">`, `og:description`,
  `twitter:description` and the `BlogPosting` JSON-LD. Leave it empty and the
  public page renders an empty meta (Google then picks an arbitrary excerpt),
  so fill it in.

## 7. Back up your content

D1 and R2 are the only places your content exists. Keep a Git mirror of the
text:

```bash
bun run content:sync -- --config=apps/site/wrangler.jsonc
```

Restore and Time Travel procedures: [`docs/backup.md`](./backup.md).

## Migrating an existing blog

To import a Markdown blog instead of starting from scratch, follow the
[Migration](../README.md#migration) section of the README.

## Updating from the template

`pzz-cms` is the upstream template. Your repository is a deployment: code flows
from the template to your repository, never the reverse, and never `apps/cms`.
The exact rules and the sync procedure are in
[`docs/template-vs-blog.md`](./template-vs-blog.md).
