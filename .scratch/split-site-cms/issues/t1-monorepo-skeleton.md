# T1 — Monorepo skeleton

## Status: done

## Blocking edges: none (root ticket)

## Goal

Turn the single-package repo into bun workspaces without changing behaviour:
`apps/site`, `apps/cms`, `packages/core` exist and everything that was at
`src/` has a new home.

## Work

1. Root `package.json`: `"workspaces": ["apps/*", "packages/*"]`, private,
   scripts become orchestrators (`build:site`, `build:cms`, `dev:cms`, `dev`,
   `check`, `test`, `e2e` — may delegate to per-package scripts or `--filter`).
   Keep `astro`, `vitest`, `@playwright/test`, `biome`, `typescript` and the
   scripts' deps at the root or where they belong; drop `better-auth`, `jose`,
   `@astrojs/react` from the root.
2. `packages/core`: package `@pzz-cms/core`, `"exports": { ".": "./src/index.ts" }`,
   deps `@mdx-js/mdx`, `remark-gfm`, `@cloudflare/workers-types`. Move:
   - `src/content/**` → `packages/core/src/content/**`
   - `src/lib/**` → `packages/core/src/lib/**`
   - mdx components `src/components/{callout,faq,figure,graph-*,mdx,quote,steps,terminal,ui,verse}.tsx` and `src/components/documents/json-document.tsx` → `packages/core/src/components/**`
   - `src/env.d.ts` split: Cloudflare bindings types live in core or per app
   - core exports an `index.ts` re-exporting the content module and helpers
3. `apps/site`: package `@pzz-cms/site` with an Astro config, empty `src/`,
   depending on `@pzz-cms/core` (workspace). `apps/cms`: same shape for
   `@pzz-cms/cms`.
4. Update all imports in moved files to the new package boundary
   (`@pzz-cms/core/...`), and the `@/` aliases inside each app.
5. Root `bun install` resolves cleanly; `bun run build:site`/`build:cms` run
   (still building empty apps at this point); `astro check` passes.

## Out of scope

- Moving actual pages (T2/T3), tests (T5), docs (T6), auth purge (T4).

## Done when

- `bun install` clean, `bun run check` green, workspace structure matches the
  spec (`docs/spec/split-site-cms.md`).
