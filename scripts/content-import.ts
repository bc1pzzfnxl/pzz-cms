/**
 * Restore articles from the Git mirror into D1.
 *
 *   bun run content:import -- --config=wrangler.deploy.jsonc [--dir=content] [--dry-run] [--local]
 *
 * The mirror holds text only. R2 images must still exist; the import recreates
 * their `media` rows from `media.json` so dimensions and alt text come back.
 * MDX is recompiled in the script, so `body_html` reflects the current component
 * set rather than the HTML of the day.
 */
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArticleMirror } from "../src/lib/content-mirror";
import { mdxComponents } from "../src/lib/mdx-components";
import { renderMdxToHtml } from "../src/lib/render-mdx";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);

const config = args.get("config") ?? "wrangler.deploy.jsonc";
const dir = args.get("dir") ?? "content";
const dryRun = args.has("dry-run");
const local = args.has("local");

interface CategoryFile {
  slug: string;
  name: string;
  position: number;
}

interface MediaFile {
  r2_key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

function query<T>(sql: string): T[] {
  const result = Bun.spawnSync(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      local ? "--local" : "--remote",
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

function sqlValue(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

const files = (await readdir(join(dir, "articles"))).filter((name) => name.endsWith(".mdx")).sort();
if (files.length === 0) throw new Error(`No .mdx files found in ${join(dir, "articles")}`);

const categories = JSON.parse(
  await readFile(join(dir, "categories.json"), "utf8"),
) as CategoryFile[];
const media = JSON.parse(await readFile(join(dir, "media.json"), "utf8")) as MediaFile[];

const existingCategories = query<{ id: string; slug: string }>("SELECT id, slug FROM categories");
const categoryIds = new Map(existingCategories.map((row) => [row.slug, row.id]));
const statements: string[] = [];

for (const category of categories) {
  const id = categoryIds.get(category.slug) ?? crypto.randomUUID();
  categoryIds.set(category.slug, id);
  statements.push(
    `INSERT INTO categories (id, slug, name, position) VALUES (${sqlValue(id)}, ${sqlValue(
      category.slug,
    )}, ${sqlValue(category.name)}, ${category.position})
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, position = excluded.position;`,
  );
}

for (const row of media) {
  statements.push(
    `INSERT INTO media (id, r2_key, width, height, alt) VALUES (${sqlValue(
      crypto.randomUUID(),
    )}, ${sqlValue(row.r2_key)}, ${row.width ?? "NULL"}, ${row.height ?? "NULL"}, ${sqlValue(
      row.alt,
    )})
     ON CONFLICT(r2_key) DO UPDATE SET width = excluded.width, height = excluded.height, alt = excluded.alt;`,
  );
}

for (const file of files) {
  const raw = await readFile(join(dir, "articles", file), "utf8");
  const article = parseArticleMirror(raw, file.replace(/\.mdx$/, ""));
  const bodyHtml = await renderMdxToHtml(article.bodyMdx, mdxComponents);
  const categoryId = article.category ? (categoryIds.get(article.category) ?? null) : null;
  const publishedAt =
    article.status === "published"
      ? (article.publishedAt ?? article.updatedAt ?? new Date().toISOString())
      : null;
  const updatedAt = article.updatedAt ?? new Date().toISOString();

  statements.push(
    `INSERT INTO articles (id, slug, title, description, body_mdx, body_html, status, lang, og_image_key, category_id, published_at, updated_at)
     VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(article.slug)}, ${sqlValue(
       article.title,
     )}, ${sqlValue(article.description)}, ${sqlValue(article.bodyMdx)}, ${sqlValue(bodyHtml)}, ${sqlValue(
       article.status,
     )}, ${sqlValue(article.lang)}, ${sqlValue(article.imageKey)}, ${sqlValue(
       categoryId,
     )}, ${sqlValue(publishedAt)}, ${sqlValue(updatedAt)})
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, description = excluded.description,
       body_mdx = excluded.body_mdx, body_html = excluded.body_html,
       status = excluded.status, lang = excluded.lang,
       og_image_key = excluded.og_image_key, category_id = excluded.category_id,
       published_at = excluded.published_at, updated_at = excluded.updated_at;`,
  );
}

const sql = `${statements.join("\n")}\n`;
const tempDir = await mkdtemp(join(tmpdir(), "content-import-"));
const sqlPath = join(tempDir, "content-import.sql");
await writeFile(sqlPath, sql, "utf8");

if (dryRun) {
  await writeFile("content-import.sql", sql, "utf8");
  console.log(`Dry run: ${statements.length} statement(s) written to content-import.sql`);
} else {
  const result = Bun.spawnSync(
    [
      "bunx",
      "wrangler",
      "d1",
      "execute",
      "DB",
      local ? "--local" : "--remote",
      "--config",
      config,
      `--file=${sqlPath}`,
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if (result.exitCode !== 0) throw new Error("D1 import failed");
  console.log(`Imported ${files.length} article(s) and ${media.length} media row(s).`);
}

await rm(tempDir, { recursive: true, force: true });
