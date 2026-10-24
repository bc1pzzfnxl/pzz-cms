/**
 * Delete media rows and R2 objects that no current article/document references.
 *
 *   bun run media:gc -- --bucket=pzz-cms-media --config=wrangler.deploy.jsonc [--days=7] [--dry-run]
 *
 * Only unreferenced media older than `--days` is removed, so an image uploaded
 * for an article that is still being edited is not deleted. The Git mirror is
 * text-only: old revisions may reference an image removed here.
 */
import { mediaObjectKeys } from "../src/lib/media";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);

const config = args.get("config") ?? "wrangler.deploy.jsonc";
const bucket = args.get("bucket");
const days = Number(args.get("days") ?? 7);
const dryRun = args.has("dry-run");

if (!bucket) {
  console.error("Usage: bun run media:gc -- --bucket=<r2-bucket> --config=wrangler.deploy.jsonc");
  process.exit(1);
}

function query<T>(sql: string): T[] {
  const result = Bun.spawnSync(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--json",
      "--command",
      sql,
    ],
    { stdout: "pipe", stderr: "inherit" },
  );
  if (result.exitCode !== 0) throw new Error(`D1 query failed: ${sql}`);

  const text = result.stdout.toString();
  const start = text.indexOf("[");
  if (start === -1) throw new Error(`Unexpected D1 output: ${text.slice(0, 200)}`);
  return (JSON.parse(text.slice(start))[0].results ?? []) as T[];
}

const media = query<{ r2_key: string; created_at: string }>(
  "SELECT r2_key, created_at FROM media ORDER BY created_at ASC",
);
const references = query<{ text: string }>(
  `SELECT og_image_key AS text FROM articles WHERE og_image_key IS NOT NULL
   UNION ALL SELECT body_mdx FROM articles
   UNION ALL SELECT body_html FROM articles
   UNION ALL SELECT body_json FROM documents`,
);
const referenced = references.map((row) => row.text).join("\n");

const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const candidates = media.filter((row) => {
  if (referenced.includes(row.r2_key)) return false;
  const createdAt = new Date(row.created_at).getTime();
  return Number.isFinite(createdAt) && createdAt < cutoff;
});

if (candidates.length === 0) {
  console.log("No orphan media to delete.");
  process.exit(0);
}

for (const row of candidates) {
  if (dryRun) {
    console.log(`would delete ${row.r2_key}`);
    continue;
  }

  let objectsDeleted = true;
  for (const key of mediaObjectKeys(row.r2_key)) {
    const result = Bun.spawnSync(
      [
        "bunx",
        "wrangler",
        "r2",
        "object",
        "delete",
        `${bucket}/${key}`,
        "--remote",
        "--config",
        config,
      ],
      { stdout: "inherit", stderr: "inherit" },
    );
    if (result.exitCode !== 0) {
      console.warn(`Could not delete R2 object ${key}; keeping the media row.`);
      objectsDeleted = false;
      break;
    }
  }
  if (!objectsDeleted) continue;

  const deleted = Bun.spawnSync(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--command",
      `DELETE FROM media WHERE r2_key = '${row.r2_key.replace(/'/g, "''")}'`,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if (deleted.exitCode === 0) console.log(`deleted ${row.r2_key}`);
}

console.log(`${dryRun ? "Would delete" : "Deleted"} ${candidates.length} orphan media.`);
