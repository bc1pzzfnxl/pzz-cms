import { $ } from "bun";

// 1. Build the CMS with the local (real-id) config.
await $`CMS_WRANGLER_CONFIG=wrangler.local.jsonc bun run --filter @pzz-cms/cms build`;

// 2. Serve it on :8788 with remote bindings to production D1/R2.
//
// `wrangler dev` cannot run under Bun: Bun's `fetch()` ignores the undici
// `dispatcher` that Miniflare's dev proxy relies on (bun issue #39247), so it
// must be driven by Node. `bunx wrangler` is still fine for one-shot commands
// (d1 execute, r2 object, migrations, deploy) — only the dev server needs Node.
//
// Resolve wrangler's real entry (`bin/wrangler.js`) instead of the bin shim:
// on Windows `node_modules/.bin` holds Bun launchers (`wrangler.exe`) that
// Node cannot execute, and Bun's isolated installs only symlink on POSIX.
import { fileURLToPath } from "node:url";

const wranglerBin = fileURLToPath(
  new URL("bin/wrangler.js", import.meta.resolve("wrangler/package.json")),
);
await $`node ${wranglerBin} dev --remote --config apps/cms/dist/server/wrangler.json --port 8788`;
