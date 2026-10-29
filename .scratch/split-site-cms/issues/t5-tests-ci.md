# T5 — Tests + CI orchestration

## Status: done

## Blocking edges: T2, T3, T4

## Goal
Root `tests/` split into `site/`, `cms/`, `core/` projects; CI runs two jobs.

## Work
1. Rehome unit tests:
   - `tests/core/`: content, content-mirror, media, migration, mdx-html,
     mdx-normalize, render-mdx, slug, parity, format-number, llms, seo,
     json-document.
   - `tests/site/`: foundation + anything site-specific.
   - `tests/cms/`: admin-related unit tests (minus auth).
   Update imports to `@pzz-cms/core`.
2. E2E: `tests/site/` keeps `home-preview.spec.ts` (+ site smoke);
   `tests/cms/` keeps `admin`, `categories`, `documents` specs (no auth);
   playwright projects `site` (worker on 8787) and `cms` (worker on 8788).
3. Root scripts: `check` (biome + astro check per app + vitest),
   `test` (vitest with workspace or per-project), `e2e` (playwright with
   `--project`).
4. `.github/workflows/ci.yml`: two jobs.
   - site: biome, astro check (site + core), unit site/core, `build:site`,
     workerd smoke (existing script minus auth vars), e2e site.
   - cms: biome, astro check (cms), unit cms, `build:cms`, local-D1 seed,
     `wrangler dev` (local, NOT `--remote`) on 8788, e2e cms.
5. Keep the "prepare local D1" and smoke patterns from the current workflow.

## Done when
- `bun run check`, `bun run test`, `bun run e2e` green locally; CI workflow
  files pass a dry review against the repo scripts.
