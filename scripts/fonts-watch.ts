/**
 * Poll the production D1 for article changes and regenerate the site fonts.
 *
 *   bun run fonts:watch [--config=apps/site/wrangler.jsonc] [--interval=15]
 *
 * Started by `bun run dev:cms` (alongside the wrangler dev server), so fonts
 * stay in sync while articles are created or edited in the CMS. Each save in
 * the admin bumps `updated_at`; the watcher regenerates on the next poll, and
 * optimize-fonts.ts skips the write when the outputs are byte-identical.
 */
import { articleSignature, dumpContentText, resolveD1Config } from "./fonts";
import { optimizeFonts } from "./optimize-fonts";

export interface WatchOptions {
  config?: string;
  /** Seconds between polls; doubling as the edit debounce. */
  intervalSec?: number;
  /** Loop condition, used to stop when the dev server exits. */
  isAlive?: () => boolean;
}

export async function watchFonts(opts: WatchOptions = {}): Promise<void> {
  const config = opts.config ?? resolveD1Config();
  const intervalMs = (opts.intervalSec ?? 15) * 1000;
  const isAlive = opts.isAlive ?? (() => true);

  let last: string | null = null;
  let warned = false;
  console.log(`[fonts:watch] polling articles in remote D1 every ${intervalMs / 1000}s`);

  while (isAlive()) {
    const signature = articleSignature(config);
    if (signature === null) {
      if (!warned) {
        console.error("[fonts:watch] D1 poll failed (offline?); will retry");
        warned = true;
      }
    } else if (last === null) {
      last = signature; // first observation: adopt, do not regenerate
    } else if (signature !== last) {
      last = signature;
      try {
        const { changed } = await optimizeFonts(dumpContentText(config));
        console.log(changed ? "[fonts:watch] fonts regenerated" : "[fonts:watch] fonts unchanged");
      } catch (error) {
        console.error(`[fonts:watch] regeneration failed: ${(error as Error).message}`);
      }
    }
    await Bun.sleep(intervalMs);
  }
}

if (import.meta.main) {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, "").split("=");
      return [key, rest.join("=")];
    }),
  );
  await watchFonts({
    config: resolveD1Config(args.get("config")),
    intervalSec: args.has("interval") ? Number(args.get("interval")) : undefined,
  });
}
