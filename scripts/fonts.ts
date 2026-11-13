/**
 * Regenerate the site's web fonts from the current article content.
 *
 *   bun run fonts [--config=apps/site/wrangler.jsonc]
 *
 * Dumps every article (drafts included: they will be published one day and
 * the subsets must already cover their characters) from remote D1 and runs
 * scripts/optimize-fonts.ts. Wired into `deploy`, and polled by
 * `bun run fonts:watch` while the CMS is open.
 *
 * If the D1 dump fails but committed font outputs exist, exits 0 with a loud
 * warning: the committed subsets stay valid until a real regeneration runs.
 */
import { existsSync } from "node:fs";
import { d1Query } from "./lib/d1";
import { contentTextFromRows, optimizeFonts } from "./optimize-fonts";

export const DEFAULT_CONFIG = "apps/site/wrangler.jsonc";

/**
 * Pick the first available Wrangler config carrying a real D1 database.
 * Template clones without a deployment config keep the placeholder
 * apps/site/wrangler.jsonc: the dump then fails and fonts.ts keeps the
 * committed subsets (loud warning). Explicit `--config=` always wins.
 */
export function resolveD1Config(explicit?: string): string {
  if (explicit) return explicit;
  for (const candidate of [
    "wrangler.deploy.jsonc",
    "apps/cms/wrangler.local.jsonc",
    DEFAULT_CONFIG,
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return DEFAULT_CONFIG;
}

const DUMP_SQL = "SELECT title, description, body_mdx, status FROM articles";
const SIGNATURE_SQL =
  "SELECT COUNT(*) AS n, MAX(updated_at) AS last_update, MAX(length(body_mdx)) AS len FROM articles";

/** Dump article content from remote D1 and flatten it for the font census. */
export function dumpContentText(config = DEFAULT_CONFIG): string {
  const rows = d1Query<Record<string, string | null>>(DUMP_SQL, config);
  return contentTextFromRows(rows);
}

/**
 * Cheap fingerprint of the article table (count + latest edit + max body
 * length), for change polling. Returns null when the query fails.
 */
export function articleSignature(config = DEFAULT_CONFIG): string | null {
  try {
    const rows = d1Query<{ n: number; last_update: string | null; len: number | null }>(
      SIGNATURE_SQL,
      config,
    );
    const row = rows[0];
    return row ? `${row.n}:${row.last_update}:${row.len}` : null;
  } catch {
    return null;
  }
}

if (import.meta.main) {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, "").split("=");
      return [key, rest.join("=")];
    }),
  );
  const config = resolveD1Config(args.get("config"));

  let contentText: string;
  try {
    contentText = dumpContentText(config);
  } catch (error) {
    if (existsSync("apps/site/public/fonts/geist-sans-core.woff2")) {
      console.error(
        `WARNING: could not dump D1 for font regeneration (${(error as Error).message}); keeping the committed font subsets.`,
      );
      process.exit(0);
    }
    throw error;
  }
  const { changed, fonts } = await optimizeFonts(contentText);
  if (!changed) console.log("fonts already up to date (outputs byte-identical)");
  else
    for (const f of fonts) console.log(`${f.family}: core ${f.coreBytes} B, ext ${f.extBytes} B`);
}
