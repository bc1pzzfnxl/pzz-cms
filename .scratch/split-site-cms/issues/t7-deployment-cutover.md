# T7 — Deployment repo + cutover

## Status: in progress

## Blocking edges: T1..T6

## Needs user: Cloudflare auth (`bunx wrangler login`) for `wrangler dev --remote` and the deploy.

## Work
1. Clone `bc1pzzfnxl/bc1pzzfnxl-blog` fresh; sync `apps/site` +
   `packages/core` + `migrations/` + `scripts/` + root manifests + docs per
   the new `template-vs-blog.md` (never `apps/cms`).
2. In the blog repo: `bun install`, `bun run build:site`, then verify
   `bun run dev:cms` boots and reads production D1 (read-only checks: list
   articles/categories, one media key).
3. Deploy the site Worker (`NODE_TLS_REJECT_UNAUTHORIZED=0 bunx wrangler
   deploy` with the blog's `wrangler.jsonc`). Verify `/` 200, `/admin/` 404,
   `/api/auth/*` 404, categories/articles/media OK, sitemap/RSS OK.
4. Production cleanup: DROP the better-auth tables on prod D1; delete the
   auth secrets from the Worker.
5. Verify the local CMS can still edit (create a draft → publish → site
   shows it → unpublish).

## Done when
- Production serves the split site, admin gone from the public surface, local
  CMS operates against production data.
