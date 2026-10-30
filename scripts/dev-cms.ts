import { $ } from "bun";

// 1. Build the CMS with the local (real-id) config.
await $`CMS_WRANGLER_CONFIG=wrangler.local.jsonc bun run --filter @pzz-cms/cms build`;

// 2. Serve it on :8788 with remote bindings to production D1/R2.
//
// `wrangler dev` cannot run under Bun: Bun's `fetch()` ignores the undici
// `dispatcher` that Miniflare's dev proxy relies on (bun issue #39247), so it
// must be driven by Node. `bunx wrangler` is still fine for one-shot commands
// (d1 execute, r2 object, migrations, deploy) — only the dev server needs Node.
const binDir = (await $`bun pm bin`.quiet().text()).trim();
await $`node ${binDir}/wrangler dev --remote --config apps/cms/dist/server/wrangler.json --port 8788`;
