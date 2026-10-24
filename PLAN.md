# pzz-cms — Implementation Plan

A light, MDX-first CMS built on Astro and Cloudflare Workers. It is developed as a **public open-source project** in this repository. Once it is stable, its code is pushed into `your-blog` (private, it holds the Markdown articles), which replaces the rendering engine of https://example.com. The blog's design and URLs stay the same.

## 1. Decisions

| Topic | Decision |
|---|---|
| Goal | Build `pzz-cms` first as a public open-source CMS, then swap the engine of `your-blog`. |
| Repository | `pzz-cms`, **public**, on GitHub. Holds code only. No article, no personal data, no secret. |
| Blog repository | `your-blog`, **private**. Holds the Markdown articles. Receives the CMS code in phase P7 via a `feat/cms` branch and a PR. |
| License | MIT (proposed, see section 6). |
| Content storage | Cloudflare D1. Code and articles are separated: code goes through Git, articles go through the admin. |
| Content format | Pure MDX. Components from mdxcn, plus `Stat`, are available inside articles. Pre-rendered to HTML at save time (ADR 0005). |
| Editor | MDXEditor with custom components. |
| Rendering | Astro SSR on Cloudflare Workers. Publication is immediate. |
| Deployment | Cloudflare Workers (Astro adapter + `wrangler.jsonc`). Cloudflare Pages is not used. HTTPS is mandatory. |
| Admin access | Password auth (Better Auth) behind a provider seam; single owner. Cloudflare Access is an optional adapter (ADR 0007). |
| Slugs | ASCII kebab-case generated from the title. Editable before publication. A change creates a 301 in the `redirects` table and updates the sitemap. |
| Titles | `title` in frontmatter, with accents. It feeds `<h1>`, `<title>` and JSON-LD. File names are ASCII slugs. |
| URLs | Page URLs are canonical with a trailing slash. `trailingSlash: "ignore"` plus middleware keeps the Better Auth routes working. Sitemap at the same address. |
| Language | French UI and content. Code and docs in English. Multilingual support is v2. |
| Media | Cloudflare R2. WebP conversion in the browser (canvas) before upload. Dimensions stored in D1. |
| SEO | Modules from `skill-seo-astro` are added one by one. The blog layout is not overwritten. |
| Linting and hooks | Biome (lint and format), TypeScript `strict`, Husky + lint-staged on pre-commit, GitHub Actions CI. |
| Commits | Conventional Commits. Branches `feat/…`, `fix/…`, `chore/…`. |
| Tests | Vitest (unit), D1 locally through `wrangler dev`, Playwright (E2E), parity script against the blog's sitemap. |
| Out of scope | openSEO, DataForSEO, Raspberry Pi hosting (later), translation plugin (v2), design overhaul (after migration). |

## 2. Data policy (public vs private)

The CMS repo is public, so the following rules apply from P0:

- No article, Markdown file, image or D1 data is committed to `pzz-cms`. Test fixtures are synthetic.
- The migration script (P6) reads the blog's Markdown **locally**, at runtime, and writes to D1. It never copies content into the repo.
- Secrets (Cloudflare API tokens, Access policies with personal emails, `.dev.vars`) are never committed. They are listed in `.gitignore`.
- `wrangler.jsonc` in the public repo is a template: the D1 and R2 IDs are placeholders, filled per deployment.
- The blog's private repo keeps the articles. When the CMS code lands there (P7), the articles are untouched.

## 3. Facts from the existing blog

- `output: "server"` with `@astrojs/cloudflare`. The blog is already SSR on Workers.
- `wrangler.jsonc` targets Workers with an `ASSETS` binding.
- `package.json` still has a `deploy` script targeting Pages. Removed in P7.
- `package.json` has an `editor` script pointing to a missing `editor/` folder. Removed in P7, as confirmed.
- `trailingSlash: "always"` and a redirect for `/le-mystère-de-barabbas/`.
- `checklist.md` lists open SEO items: `BreadcrumbList`, RSS, custom 404, author page, internal linking.
- Dependencies (keep the same major versions to avoid a mismatch at the swap): `astro` 7.1.3, `@astrojs/cloudflare` 14.1.4, `@astrojs/mdx` 7.0.3, `@astrojs/sitemap` 3.7.3, `@astrojs/react` 6.x, Tailwind 4.x, React 19, `motion`.

## 4. Tools check

Checked on this machine:

| Tool | Status | How to run |
|---|---|---|
| Bun | Installed | `bun install`, `bun run`, `bunx` |
| Git | Installed (2.47.3) | — |
| GitHub CLI (`gh`) | Installed (2.102.0) | Repo creation, PRs, CI |
| Wrangler | Global binary needs `node`, not installed. Works through Bun. | `bunx wrangler` |
| Node / npm / pnpm | Not installed, not used (see AGENTS.md) | — |

Tools to add (all through Bun):

| Tool | Phase | Purpose |
|---|---|---|
| `astro`, `@astrojs/cloudflare`, `@astrojs/mdx`, `@astrojs/react`, `@astrojs/sitemap`, `@astrojs/rss` | P0, P4 | Same versions as the blog where they exist |
| `tailwindcss`, `@tailwindcss/vite` | P0 | Blog design |
| `wrangler` (dev dependency) | P0 | D1, R2, local dev, deploy |
| shadcn CLI (`bunx shadcn@latest init`) | P0 | Admin UI components (AGENTS.md requires shadcn/ui) |
| mdxcn (`bunx shadcn@latest add https://mdxcn.dev/r/all.json`) | P2 | MDX components |
| `@mdxeditor/editor` | P2 | MDX editor |
| `vitest` | P0 onward | Unit tests |
| `@playwright/test` (+ `bunx playwright install chromium`) | P1 onward | E2E tests |
| `@biomejs/biome` | P0 | Lint and format (`bunx biome check --write .`) |
| `typescript` | P0 | `strict: true` |
| `husky`, `lint-staged` | P0 | Pre-commit: Biome on staged files, typecheck, unit tests |
| `sharp` | P6 only | Migration script for existing images, run with Bun (not in Workers) |
| `numbers`, `kugiri` (optional) | P8 | Static counters; scroll text was dropped |

Not needed for the MVP: `pnpm`, `npx` (replaced by `bunx`), the openSEO stack, a Raspberry Pi runtime.

### Environment note

`astro dev` and `astro preview` run the Cloudflare Vite plugin on the real
`workerd` runtime (Astro 6). In this sandbox, `workerd` accepts connections but
never answers, and `astro dev` fails with `ECONNREFUSED` on a loopback fetch.
Plain loopback works (verified with `Bun.serve`), so this is a sandbox
limitation, not a code problem.

Resolved by CI: the `Runtime smoke test (workerd)` job in `.github/workflows/ci.yml`
boots the built Worker on GitHub Actions and checks that `/` (200), an unknown
route (404) and `/sitemap-index.xml` (200) answer. `workerd` runs fine there.
Runtime verification therefore happens in CI, not locally. On a normal machine,
`bun run dev` works as usual.

## 5. Skills check

| Skill | Use | Phase |
|---|---|---|
| `skill-seo-astro` | Required by AGENTS.md (`astro.config.*` present). Source of JSON-LD, RSS, 404, robots, llms.txt, image rehype plugin. Run with `bunx`. Never run `init` on the blog (it overwrites `index.astro` and `[slug].astro`). | P0, P4, P5 |
| `mdxcn` | MDX components for articles | P2 |
| `component-gallery` | UI wording and components for the admin (delete confirmation, empty states) | P2 |
| `web-design-guidelines` | Review of admin and public UI | P2, P4 |
| `shadscan` | UI audit (mobile layout, responsive) before the swap | P7 |
| `tdd` | Test-first for slugs, redirects, D1 reads and writes | P1 to P3 |
| `setup-pre-commit` | Husky, lint-staged, typecheck, tests | P0 |
| `domain-modeling` | `GLOSSARY.md` and ADRs for hard-to-reverse decisions (D1 as source of truth, Workers, Cloudflare Access, public repo) | P0 |
| `codebase-design` | Deep modules: a content module with a small interface (`getArticle`, `listPublished`, `saveDraft`, `publish`) hiding D1 | P1 |
| `writing-for-agents` | Repo-level `AGENTS.md` for pzz-cms | P0 |
| `writing-guidelines` | Review of docs and article prose | P7 |
| `code-review` | Review of the `feat/cms` branch against standards and plan | P7 |
| `pr` | PR body for `feat/cms` | P7 |
| `wizard` | Steps only you can do: Cloudflare Access setup, Search Console ownership, DNS switch | P2, P7 |
| `numbers` | Animated counters as MDX components (stats in articles) | P8 (optional) |
| `kugiri` | Word-by-word or typewriter text reveal, scroll text as MDX components | Dropped |
| `env-style` | Favicon for local dev environments | P0 (optional) |
| `vercel-react-best-practices` | Optional React performance review for the admin | P2 (optional) |
| `diagnosing-bugs` | Any bug that resists a first fix | All |

Not used:

| Skill | Reason |
|---|---|
| `voidauth` | Replaced by Cloudflare Access. |
| `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` | The project deploys to Cloudflare. |
| `svgl` | No brand logos needed for the MVP. |
| `shieldcn` | README badges, after the first release (the repo is public, so badges will be useful then). |
| `migrate-to-shoehorn` | Only if tests use `as` casts. |

## 6. Phases

Each phase ends with checks. A phase is done only when its checks pass (AGENTS.md: typecheck, lint, tests).

Standard check command, defined in `package.json` from P0:

```bash
bun run check   # biome check + tsc --noEmit + vitest run
```

### P0 — Foundation (public repo) — DONE

- `git init`, then `gh repo create bc1pzzfnxl/pzz-cms --public` (confirm before running).
- LICENSE (MIT), README, CONTRIBUTING.md, SECURITY.md, `.gitignore` (`node_modules`, `dist`, `.wrangler`, `.dev.vars`, local D1 state).
- Astro SSR with the Cloudflare adapter, Bun, TypeScript `strict`, Tailwind, blog design copied in `MainLayout`.
- Biome configured. Husky + lint-staged: Biome on staged files, typecheck, unit tests.
- GitHub Actions CI: install, `bun run check`, build.
- `GLOSSARY.md`, first ADRs in `docs/adr/`, repo `AGENTS.md`.
- **Exit:** `bun run build`, `bunx wrangler dev`, `bun run check` and CI all pass. Biome verified on a deliberately bad file, then reverted.

Notes from the build:

- Biome does not understand `.astro` component usage (false "unused import").
  `.astro` files are excluded from Biome and covered by `astro check` instead.
- `astro check` needs TypeScript 6.x. TypeScript 7 (the native compiler) does not
  expose the API `astro check` uses, so the project pins `typescript@^6`.
- `wrangler` cannot run in this sandbox (see the environment note above). Build
  and checks are the verifiable gates here.

### P1 — Read path — DONE

- D1 schema: `articles`, `redirects`, `media`. Migrations with `bunx wrangler d1 migrations`.
- Content module (deep module, TDD). Routes `/[slug]/` and index, same URLs as the blog.
- Synthetic seed data only.
- **Exit:** routes render from seed data. Every URL of the sitemap from the seed responds with the same status.

Notes from the build:

- The content module depends on a small `Database` interface, so it is unit
  tested on `bun:sqlite` in memory (no `workerd`).
- MDX is pre-rendered to HTML at save time and stored in `body_html` (ADR 0005).
  The public route renders that HTML.
- Unknown slugs fall back to a 301 (redirect table) or a 404.
- CI seeds local D1 and asserts the real routes on `workerd`: `/` 200,
  `/premier-article/` 200, `/brouillon/` 404, `/ancien-slug/` 301,
  `/sitemap-index.xml` 200.
- Vitest runs under Bun (`bunx --bun vitest`) so `bun:sqlite` resolves; Node
  cannot load that builtin.

### P2 — Admin — DONE

- `/admin` protected: Cloudflare Access at P2, replaced by in-app password auth in P2b. **Done:** a self-hosted app on the deployment domain, with the owner account created at `/admin/setup`.
- The staging Worker (`your-worker.workers.dev`) stays **open** on purpose: CI runs Playwright against it. Protect it with an Access service token if needed.
- MDXEditor with mdxcn components. Draft and published states.
- **Exit:** create, edit and publish an article end to end (Playwright).

Notes from the build:

- `/admin` lists drafts and published articles; `/admin/[id]` and `/admin/new`
  edit with MDXEditor. MDX is compiled to HTML in the browser before saving.
- Endpoints: `POST /admin/api/articles`, `PUT /admin/api/articles/:id`,
  `POST /admin/api/articles/:id/status`.
- shadcn theme lives in `src/styles/admin.css`; the public design is untouched.
- mdxcn is a curated subset (Callout, Quote, Steps, Faq, Terminal, GraphStat,
  GraphTable, GraphTimeline), not the full library. The full registry ships a
  broken barrel and 60+ files.
- The vendored mdxcn files are excluded from Biome (see `biome.json` overrides)
  and one broken import in `graph-frame.tsx` was fixed to `@/lib/graph-markdown`.
- mdxcn graph tokens and utilities live in `src/styles/mdxcn.css`, imported by
  both the public site and the admin, because mdxcn components render in
  article HTML on the public site.
- Vitest needs `@vitejs/plugin-react`: the project tsconfig uses
  `jsx: preserve` for Astro, so `.tsx` components need a real JSX transform in
  tests.
- E2E: create, publish and read back an article; a draft stays 404.

### P2b — Authentication — DONE

- Password auth (Better Auth) behind a small auth seam (`AuthProvider`).
- **Exit:** the admin is protected in-app; the owner signs in with a password;
  tested in CI.

Notes from the build:

- `AUTH_PROVIDER` selects `password` (default), `access`, or `none`.
- No signup; `/admin/setup` (guarded by `SETUP_TOKEN`) lets the owner choose a
  password; a hook refuses a second account. The password changes at
  `/admin/password` (current + new, keeps the session).
- Sessions live in D1, 7 days with a 1-day rolling refresh. Recovery: `bun run auth:reset`.
- Passkeys were evaluated and removed: many machines have no usable
  authenticator, which would lock the owner out.
- Two Astro traps, both load-bearing:
  - Astro emits the `trailingSlash` redirect **before** middleware, so the auth
    API must be served from middleware; `trailingSlash` is now `"ignore"` with a
    canonical redirect for pages.
  - `trailingSlash: "always"` would otherwise 301 the Better Auth routes.

### P3 — Slugs and redirects — DONE

- Slug generation (ASCII kebab-case, accents removed), uniqueness check, edit before publication.
- Slug change after publication creates a 301 in `redirects` and updates the sitemap.
- **Exit:** unit tests for slug rules, E2E test for the redirect.

Notes from the build:

- `slugify` and `uniqueSlug` (P1) cover generation and de-duplication; the slug
  stays editable from the admin.
- `updateArticle` records a 301 when a published article's slug changes, and
  re-points existing redirects instead of chaining them.
- The sitemap is not dynamic yet; once it is (P4) it will reflect the new slug
  automatically, since it reads published articles.
- E2E: rename a published slug, assert the old URL answers 301 and the new one
  200.

### P4 — SEO — DONE

- JSON-LD (`BlogPosting`, `WebSite`, `BreadcrumbList`), Open Graph, Twitter cards.
- Sitemap, RSS (`@astrojs/rss`), custom 404, `robots.txt`, `llms.txt`, author page, internal linking.
- **Exit:** every item of the blog's `checklist.md` section 2 is ticked and tested.

Notes from the build:

- `src/lib/seo.ts` holds the schemas (unit tested). Article pages emit
  `BlogPosting` + `BreadcrumbList` and full OG article metadata.
- The sitemap is dynamic: `/sitemap.xml` reads published articles from D1 and
  `/sitemap-index.xml` is kept because the blog declares it in Search Console.
- `/rss.xml` via `@astrojs/rss`. `/auteur/` renders a `Person` schema.
- `public/robots.txt` and `public/llms.txt` are served as static assets.
- `@astrojs/sitemap` was dropped: under SSR it produced an empty static sitemap
  that shadowed the dynamic route.
- CI asserts the sitemap and RSS contain a published article and never a draft.
- Internal linking stays editorial (manual links between articles); not
  automated.

### P5 — Media — DONE

- WebP conversion in the browser (canvas) before upload to R2. Dimensions stored in `media`.
- **Exit:** an uploaded image renders with `width` and `height`, no layout shift.

Notes from the build:

- `src/lib/image.ts` converts to WebP on a canvas in the browser (Workers cannot
  run image tooling).
- `POST /admin/api/media/` stores the object in R2 and records key, width,
  height and alt in D1. `GET /media/<key>/` streams it with immutable caching.
- Media responses are cached at the edge (`caches.default`), so R2 reads stay
  well inside the free tier; uploads are capped at 1 MB. A dashboard spending
  limit is the hard stop (README, "R2 cost control").
- Two Astro gotchas, both load-bearing:
  - Page URLs are canonical with a trailing slash; `trailingSlash` is
    `"ignore"` so the auth API is not redirected, and middleware 301s page URLs.
    The media route accepts `/media/<key>/` and strips the trailing slash.
  - Astro's CSRF guard rejects cross-origin form POSTs; callers must send a
    same-origin `Origin` header (the browser does).
- The article cover and `og:image` use the media key, with intrinsic dimensions
  from D1 (zero CLS).
- Unit tests cover the media helpers and the content media methods; E2E uploads
  a PNG, asserts WebP conversion and public serving.

### P6 — Migration and parity — DONE

- Local script (Bun, `sharp` for images) reads the blog's `.mdx` files and imports them into D1. Old URLs and redirects are kept. Nothing is committed to the public repo.
- Parity script: crawls every URL of the blog's sitemap on staging and compares status codes, titles, canonical tags and JSON-LD.
- **Exit:** parity report has no difference. chrome-devtools is used for visual checks.

Result: **parity OK** against production (`https://example.com` vs the
staging Worker) for all 5 URLs. Titles, canonicals, `<h1>` and status match;
`BreadcrumbList` is an allowed addition.

Notes from the build:

- `src/lib/migration.ts` (unit tested): frontmatter parsing, slug, description,
  image-key extraction, `/images/*` → `/media/images/*/` rewriting, SQL export.
  It keeps the frontmatter `imageAlt` as the cover media row's `alt`, so the
  published cover caption is the real description, not the article title.
- `scripts/migrate.ts` reads a content directory, compiles each body to HTML and
  writes `migration-output/articles.sql` + `r2-upload.sh`. Output is gitignored;
  the articles stay private.
- Verified locally on the 4 reference articles: 4 rows, 12 images, and the SQL
  applies cleanly to `migrations/0001_init.sql` in SQLite.
- `src/lib/parity.ts` (unit tested) + `scripts/parity.ts`: fetch both sites,
  compare status, title, canonical, h1 and JSON-LD types; exits non-zero on any
  difference.
- React 19 `renderToStaticMarkup` emits a `<link rel="preload">` per image; the
  compiler strips them so body images are never preloaded (only the cover is).
- **Pending:** the parity run needs a staging deploy and the production sitemap.
- **Known gap:** body image `width`/`height` are not injected yet (CLS on body
  images). The cover has intrinsic dimensions from D1; body images rely on the
  media table, which is not consulted at render time.

### P7 — Switch — DONE

- Copy the CMS code into `your-blog` on `feat/cms`, open a PR, review with `code-review`, describe with `pr`.
- Remove the Pages `deploy` script and the `editor` script.
- Final `shadscan` audit. DNS switch and Search Console check (`wizard`).
- **Exit:** the domain serves the new engine, and the parity check passes against production.

Done:

- PR [your-blog#1](https://github.com/your-org/your-blog/pull/1) merged into `main`.
- The blog's `src/content/*.md` were removed (content lives in D1; kept in git history).
- The Pages `deploy` script and the `editor` script are gone; `bun run deploy`
  uses the adapter entrypoint (`@astrojs/cloudflare/entrypoints/server`), so a
  plain `wrangler deploy` works.
- Deployed manually to the existing blog Worker. **No DNS change**: the domain
  already pointed there, so nothing was lost.
- Verified on production: the 5 original URLs return 200 with JSON-LD;
  `/admin/` now redirects to the in-app login (Cloudflare Access at the time);
  `/sitemap.xml` and `/rss.xml` return 200; parity between staging and
  production is OK.
- **Follow-up resolved:** the Cloudflare "Workers Builds" integration on the blog
  repo now succeeds. It needed the `BUN_VERSION` build variable (`1.4.3`): the
  build image ships Bun 1.2, which cannot read the `bun.lock` lockfile
  (lockfileVersion 2). The blog's deploy command is `npx wrangler versions
  upload` (a preview upload, not a live deploy), so production still deploys
  manually.

### P8 — Optional enhancements — PARTIAL

- `numbers` as an MDX component for article content. Scroll and typewriter text
  (`kugiri`) were dropped: public pages ship no animation script.
- Design improvements to the blog (after the switch).
- **Exit:** each component has a unit test and renders in MDXEditor and on the public page.

Done:

- `Stat` (numbers): renders the final formatted value. Uses Intl formatting
  (`src/lib/format-number.ts`); there is no counter animation.
- `Reveal` (kugiri): kept as a legacy plain span so existing articles keep
  compiling. It renders static text; the scroll reveal and the kugiri enhancer
  were removed.
- Both are wired into the MDX component map. Public pages load no animation
  script and no React island; unit tests cover formatting and the static output.

Not done:

- `@sfinterface/numbers` was not adopted: it animates on value change
  (interactive dashboards), not on view, and would need React hydration on the
  public page. `Stat` is self-contained and SEO-safe.
- Design improvements to the blog: still open.

The editor preview now renders the same compiled HTML as the published page
(`renderMdxToHtml` + `optimizeBodyImages`), and the blog repository is synced.

## 7. Open points

1. **License.** MIT is in place.
2. **Repo creation.** Done: `bc1pzzfnxl/pzz-cms` is public.
3. **Authentication (P2b).** Done: in-app password auth (ADR 0007); Cloudflare Access remains an optional adapter.
4. **Hosting on Raspberry Pi.** Not part of this plan. Revisit after P7.
5. **Blog transition (P7).** Done.
6. **App-level auth — DONE (ADR 0007).** Password auth behind a provider seam; `access` kept as an option. See "P2b — Authentication".

## 8. Repository layout (target)

```
pzz-cms/
├── PLAN.md
├── README.md
├── LICENSE
├── AGENTS.md              # repo-level, adds to the global one
├── CONTRIBUTING.md
├── SECURITY.md
├── GLOSSARY.md
├── docs/adr/              # hard-to-reverse decisions
├── migrations/            # D1 migrations
├── scripts/               # migration and parity scripts (no content)
├── .github/workflows/     # CI
├── src/
│   ├── content/           # content module (deep module)
│   ├── components/        # shadcn, mdxcn, numbers
│   ├── layouts/           # MainLayout (blog design)
│   ├── lib/               # SEO helpers, slugs, redirects, WebP conversion
│   └── pages/             # public pages and /admin
├── tests/                 # unit (Vitest) and E2E (Playwright), synthetic data only
├── astro.config.mjs
├── wrangler.jsonc         # template, IDs filled per deployment
├── biome.json
└── package.json
```
