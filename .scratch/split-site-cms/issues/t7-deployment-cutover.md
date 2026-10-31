# T7 — Deployment repo + cutover

## Status: in progress (deployed; one user step left)

## Blocking edges: T1..T6

## Work

1. Clone `bc1pzzfnxl/bc1pzzfnxl-blog` fresh; sync `apps/site` +
   `packages/core` + `migrations/` + `scripts/` + root manifests + docs per
   the new `template-vs-blog.md` (never `apps/cms`).
2. In the blog repo: `bun install`, `bun run build:site`, then verify
   `bun run dev:cms` boots and reads production D1 (read-only checks: list
   articles/categories, one media key).
3. Deploy the site Worker (`bun run deploy` — builds, then
   `bunx wrangler deploy --config apps/site/dist/server/wrangler.json`; the
   emitted config carries `main` + `assets`, the source one does not).
4. Production cleanup: DROP the better-auth tables on prod D1; delete the
   auth secrets from the Worker.
5. Verify the local CMS can still edit (create a draft → publish → site
   shows it → unpublish).

## Progress

- 2026-10-31: `feat/split-site-cms` synced + merged to `main` (`168cd43`)
  with `session: false`, the `check` script on `bun run test`, and the
  deploy script fix.
- 2026-10-31: Deployed worker `bc1pzzfnxl-blog` version `f3a8a124`
  (bindings: DB, MEDIA, IMAGES, ASSETS — no KV SESSION, no auth).
- 2026-10-31: Production verified: `/` 200, articles/categories/auteur 200,
  sitemap/RSS/robots/llms 200, `/admin/` 404, `/api/auth/*` → 301 → 404.
- 2026-10-31: D1 cleanup done — dropped `user` (1), `session` (7),
  `account` (1), `verification` (0), `passkey` (0), `rateLimit` (1);
  content tables untouched (`articles`, `categories`, `documents`, `media`).
  Time Travel covers the drop for 7 days.
- 2026-10-31: Worker secrets deleted (`BETTER_AUTH_SECRET`,
  `ADMIN_PASSWORD`) — `secret list` now empty.

## Left

- User: run the full local-CMS edit cycle (`bun run dev:cms` on their
  machine): create a draft → publish → see it on the site → unpublish.
- Optional: orphan KV namespace `bc1pzzfnxl-blog-session` (old Astro
  sessions binding) — deleted with the user's go-ahead on 2026-10-31;
  `online-cv-session` belongs to another project, untouched.
- Backlog fallout: D1 tables `redirects` and `_cf_KV` are referenced by no
  code — decide keep/drop later.

## Done when

- Production serves the split site, admin gone from the public surface,
  local CMS operates against production data.
