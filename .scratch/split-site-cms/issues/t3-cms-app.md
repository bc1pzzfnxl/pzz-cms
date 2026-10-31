# T3 — CMS app

## Status: done

## Blocking edges: T1

## Goal

`apps/cms` becomes the local-only admin: same CRUD surface for articles,
categories, documents, media — without auth.

## Work

1. Move into `apps/cms/src`: `pages/admin/**` minus `login.astro`,
   `password.astro`, `setup.astro`, `api/setup.ts`; `layouts/AdminLayout.astro`;
   `components/admin/**`; `styles/admin.css`; `pages/media/[...key].ts`
   (editor previews need image URLs).
2. Remove every import of `src/auth/**` and the auth React components
   (`components/auth/**`). Admin pages become unauthenticated.
3. `astro.config.mjs` for cms: keep `@astrojs/react`, `@tailwindcss/vite`;
   adapter cloudflare; alias `@` → `apps/cms/src`.
4. `apps/cms/package.json`: deps = astro, `@astrojs/cloudflare`,
   `@astrojs/react`, `react`, `react-dom`, `@mdxeditor/editor`, `radix-ui`,
   `lucide-react`, `motion`, `clsx`, `class-variance-authority`,
   `tailwind-merge`, `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`,
   `@pzz-cms/core`. No better-auth, no jose.
5. `apps/cms/wrangler.jsonc`: bindings `DB` + `MEDIA` (placeholders in the
   template; the deployment repo carries its own with real ids).
6. Editor live preview keeps working (client-side MDX compile — untouched).

## Done when

- `bun run build:cms` builds; `bun run dev:cms` boots against a local D1 (CI
  mode) and the admin CRUD e2e pass without any auth step.
