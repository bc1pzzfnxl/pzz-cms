/**
 * Build a local-seed SQL file from D1 JSON dumps, for the font pixel-diff
 * harness (scripts/font-pixel-diff.ts). Reads the dump-*.json files produced
 * with `bunx wrangler d1 execute pzz-cms --remote --json --command "SELECT ..."`.
 *
 * Usage: bun scripts/font-seed.ts <dump-dir> [<out.sql>]
 *   dump-dir must contain dump-articles.json, dump-categories.json,
 *   dump-documents.json and dump-redirects.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: bun scripts/font-seed.ts <dump-dir> [<out.sql>]");
  process.exit(1);
}
const outPath = process.argv[3] ?? join(dir, "seed-local.sql");

function rows(name: string): Record<string, unknown>[] {
  const dump = JSON.parse(readFileSync(join(dir, `dump-${name}.json`), "utf8"));
  return (dump.results ?? dump[0]?.results ?? []) as Record<string, unknown>[];
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

let out = "PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n";

for (const name of ["categories", "articles", "documents", "redirects"]) {
  for (const row of rows(name)) {
    const cols = Object.keys(row);
    out += `INSERT INTO ${name} (${cols.join(",")}) VALUES (${cols
      .map((c) => sqlValue(row[c]))
      .join(",")});\n`;
  }
}
out += "COMMIT;\n";

writeFileSync(outPath, out);
console.log(`wrote ${outPath} (${out.length} B)`);
