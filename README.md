<div align="center">

# pzz-cms

**A light, MDX-first CMS on Astro and Cloudflare Workers.**
The public site is deployed on Workers; the admin runs on your machine; content lives in D1 and media in R2.

[![License](https://shieldcn.dev/github/bc1pzzfnxl/pzz-cms/license.svg)](./LICENSE)
[![CI](https://shieldcn.dev/github/bc1pzzfnxl/pzz-cms/ci.svg)](https://github.com/bc1pzzfnxl/pzz-cms/actions)
[![Stars](https://shieldcn.dev/github/bc1pzzfnxl/pzz-cms/stars.svg)](https://github.com/bc1pzzfnxl/pzz-cms/stargazers)
[![PRs welcome](https://shieldcn.dev/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[![Astro](https://shieldcn.dev/badge/Astro-5-BC52EE.svg?logo=astro&logoColor=white)](https://astro.build)
[![Cloudflare Workers](https://shieldcn.dev/badge/Cloudflare_Workers-deployed-F38020.svg?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![TypeScript](https://shieldcn.dev/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://shieldcn.dev/badge/Bun-1.4-000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![Tailwind CSS](https://shieldcn.dev/badge/Tailwind_CSS-v4-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![MDX](https://shieldcn.dev/badge/MDX-content-1B1F24.svg?logo=mdx&logoColor=white)](https://mdxjs.com)
[![Biome](https://shieldcn.dev/badge/Biome-lint_%2B_format-60A5FA.svg?logo=biome&logoColor=white)](https://biomejs.dev)
[![Vitest](https://shieldcn.dev/badge/Vitest-tested-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![Playwright](https://shieldcn.dev/badge/Playwright-e2e-2EAD33.svg)](https://playwright.dev)

[Getting started](./docs/getting-started.md) ·
[Deployment](./docs/deployment.md) ·
[Architecture](./docs/spec/split-site-cms.md) ·
[Contributing](./CONTRIBUTING.md)

</div>

---

## Why pzz-cms

- **The admin is never deployed.** The public Worker serves the site only: no admin routes, no login form, no session store, no secrets in production. The CMS runs on `localhost` and writes straight to D1/R2, which is the whole security boundary.
- **One content seam.** `packages/core/src/content` is the only module that talks to D1: pages, RSS, sitemap, admin and scripts all go through it.
- **Compiled at save time.** MDX is rendered to HTML when you save, so the Worker serves static HTML and the article body carries no MDX compiler.
- **Batteries included.** Sitemap, RSS, `llms.txt`, canonical URLs, Open Graph, JSON-LD (`BlogPosting`, `BreadcrumbList`, `Person`, `CollectionPage`), 301 redirects on slug changes, table of contents, reading typography.
- **A real media pipeline.** Images are converted to WebP in the browser, uploaded with 480/800/1200 px variants, served from R2 behind the edge cache, and garbage-collected after a grace period.
- **Editable appearance.** Colours are six tokens per mode, edited in the admin with a live preview and stored in D1; callouts keep their semantic palettes.
- **Checked like production.** Biome, strict TypeScript, Vitest, Playwright end-to-end, and a CI pipeline on every push.

Saving an article writes finished HTML, so the Worker never sees MDX:

```
┌───────────────────┐     ┌─────────────┐     ┌────────┐     ┌────────────┐
│ edit in the admin │ ──► │ compile MDX │ ──► │ D1 row │ ──► │ Worker SSR │
└───────────────────┘     └─────────────┘     └────────┘     └────────────┘
```

## Architecture

Two planes share one database: the admin writes, the Worker reads.

```
YOUR MACHINE                         CLOUDFLARE
┌──────────────────────┐             ┌──────────────────────┐
│ apps/cms · :8788     │             │ apps/site · Worker   │
│ admin + MDX editor   │             │ SSR, RSS, sitemap    │
└──────────┬───────────┘             └──────────┬───────────┘
           │ writes                             │ reads
           ▼                                    ▼
    ┌──────────────────────────────────────────────────┐
    │ D1 · articles, categories, settings              │
    │ R2 · media, width variants                       │
    └──────────────────────────────────────────────────┘
```

| Package                           | Role                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/site` (`@pzz-cms/site`)     | The public site. The **only deployable app**.                                               |
| `apps/cms` (`@pzz-cms/cms`)       | The admin. **Never deployed**: it runs locally and writes directly to the production D1/R2. |
| `packages/core` (`@pzz-cms/core`) | The content module, helpers, pure styles and MDX components.                                |

Read [`docs/spec/split-site-cms.md`](./docs/spec/split-site-cms.md) for the layout and [`docs/adr/0008-split-site-cms.md`](./docs/adr/0008-split-site-cms.md) for the decision.

## Features

| Area            | What you get                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| **Editor**      | MDXEditor with live preview (same compiler as publication), image upload, raw JSX support, cover with alt |
| **Content**     | Categories, published/draft status, slug history with automatic 301s, JSON documents served at `/<slug>/` |
| **Media**       | WebP conversion in the browser, three width variants, dimensions and alt stored in D1, R2 edge cache      |
| **Appearance**  | Background, text, headings, muted, borders and links — per light/dark mode, with a lorem-ipsum preview    |
| **SEO**         | Sitemap, RSS, `llms.txt`, canonical URLs, Open Graph, Twitter cards, JSON-LD, breadcrumbs, TOC            |
| **Performance** | Server-side rendering, subsetted self-hosted fonts, no client-side framework on public pages              |
| **Operations**  | D1 migrations, `content:sync` / `content:import` mirror, `media:gc`, `migrate` importer, parity checker   |
| **Quality**     | Biome, strict TypeScript, Vitest, Playwright, CI, dependency audit                                        |

## Quick start

Requirements: [Bun](https://bun.sh) ≥ 1.4, [Node.js](https://nodejs.org) for the admin dev server (`wrangler dev` cannot run under Bun), and a Cloudflare account for D1, R2 and deployment.

```bash
bun install
bunx wrangler d1 migrations apply DB --local --config apps/site/wrangler.jsonc
bunx wrangler d1 execute DB --local --config apps/site/wrangler.jsonc --file=scripts/seed.sql
bun run dev            # public site on a local D1 → http://localhost:4321
```

The admin runs against real Cloudflare resources: copy `apps/cms/wrangler.jsonc` to a gitignored `apps/cms/wrangler.local.jsonc`, fill in your D1 and R2 ids, then:

```bash
bunx wrangler login
bun run dev:cms        # admin → http://localhost:8788/admin/
```

> `dev:cms` writes to the database configured in `wrangler.local.jsonc`. Use it for editing, not for experiments, and never commit that file.

Step-by-step, from an empty Cloudflare account to a live blog: [`docs/getting-started.md`](./docs/getting-started.md).

## Scripts

| Command                              | What it does                                               |
| ------------------------------------ | ---------------------------------------------------------- |
| `bun run dev`                        | Public site with the Astro dev server                      |
| `bun run dev:cms`                    | Admin on `wrangler dev --remote`, plus the font watcher    |
| `bun run build:site`                 | The only deployable build                                  |
| `bun run build:cms`                  | Admin build, verification only                             |
| `bun run check`                      | Biome + typecheck (both apps) + Vitest                     |
| `bun run e2e`                        | Playwright end-to-end (workers booted)                     |
| `bun run fonts`                      | Regenerate the committed font subsets from current content |
| `bun run deploy`                     | `fonts` + `build:site` + `wrangler deploy`                 |
| `bun run migrate ../your-blog/files` | Import an existing Markdown blog into D1                   |
| `bun run parity <old> <new>`         | Compare two sitemaps, URL by URL                           |
| `bun run content:sync`               | Mirror D1 text content into `content/`                     |
| `bun run content:import`             | Restore that mirror into D1                                |
| `bun run media:gc`                   | Delete media rows and R2 objects no article references     |

## Deployment

```bash
bun run deploy         # build:site then wrangler deploy --config apps/site/wrangler.jsonc
```

Fill `apps/site/wrangler.jsonc` with your own D1 database id and R2 bucket before the first deploy; never commit real ids. A deployment repository keeps its own gitignored copy, and only ever receives `apps/site` and `packages/core` — see [`docs/deployment.md`](./docs/deployment.md).

Workers Builds users: set the build command to `bun run build:site` and the `BUN_VERSION` variable to `latest`.

## Cost control

R2's free tier is 10 GB, 1M Class A and 10M Class B operations per month. Media responses go through the Cache API, so R2 is read at most once per colo per object; uploads are capped at 1 MB with WebP conversion in the browser. Set a hard spending limit in the Cloudflare dashboard (notifications alone do not cap usage).

## Documentation

| Document                                                       | Contents                                           |
| -------------------------------------------------------------- | -------------------------------------------------- |
| [`docs/getting-started.md`](./docs/getting-started.md)         | From a fresh clone to a live blog in six steps     |
| [`docs/deployment.md`](./docs/deployment.md)                   | Template vs deployment, what is shared, sync rules |
| [`docs/spec/split-site-cms.md`](./docs/spec/split-site-cms.md) | App boundaries and file layout                     |
| [`docs/backup.md`](./docs/backup.md)                           | Mirror format, restore drill, Time Travel runbook  |
| [`docs/slug.md`](./docs/slug.md)                               | Slug pipeline and the MDX render rules             |
| [`docs/figures/`](./docs/figures)                              | Figure specs and how to redraw them                |
| [`docs/adr/`](./docs/adr)                                      | Architecture decision records                      |
| [`PLAN.md`](./PLAN.md)                                         | Project plan, phases and open points               |
| [`GLOSSARY.md`](./GLOSSARY.md)                                 | Shared vocabulary                                  |

## Contributing

Changes go through a branch and a pull request; `bun run check` must pass. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, commit conventions and the review checklist. The data policy is strict: this repository holds code only — never articles, images, database dumps or secrets.

## License

[MIT](./LICENSE).
