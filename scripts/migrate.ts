/**
 * Import the old blog's Markdown into D1.
 *
 *   bun scripts/migrate.ts [contentDir] [outDir]
 *
 * Defaults: contentDir = ../bc1pzzfnxl-blog/src/content, outDir = migration-output
 *
 * It writes `articles.sql` (apply with wrangler d1 execute) and `r2-upload.sh`
 * (upload the referenced images to R2). Nothing here is committed: the output
 * directory is gitignored, and the articles stay private.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { type MigratedArticle, parseArticleFile, toInsertSql } from "../src/lib/migration";
import { renderMdxToHtml } from "../src/lib/render-mdx";

const contentDir = resolve(
  process.argv[2] ?? process.env.BLOG_CONTENT_DIR ?? "../bc1pzzfnxl-blog/src/content",
);
const outDir = resolve(process.argv[3] ?? "migration-output");
const blogRoot = resolve(contentDir, "..", "..");
const imagesDir = join(blogRoot, "public", "images");
const bucket = process.env.MEDIA_BUCKET ?? "pzz-cms-media";

const files = (await readdir(contentDir)).filter((name) => /\.(md|mdx)$/i.test(name)).sort();

const articles: MigratedArticle[] = [];
const images = new Set<string>();

for (const file of files) {
  const raw = await readFile(join(contentDir, file), "utf8");
  const { article, images: fileImages } = parseArticleFile(basename(file), raw);
  article.bodyHtml = await renderMdxToHtml(article.bodyMdx, {});
  articles.push(article);
  for (const key of fileImages) images.add(key);
}

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "articles.sql"), toInsertSql(articles), "utf8");

const uploadLines = [...images].sort().map((key) => {
  const name = key.replace(/^images\//, "");
  return `bunx wrangler r2 object put ${bucket}/${key} --file=${join(imagesDir, name)} --local`;
});
await writeFile(
  join(outDir, "r2-upload.sh"),
  [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "# Drop --local to upload to the real bucket.",
    ...uploadLines,
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Migrated ${articles.length} article(s) from ${contentDir}`);
console.log(`  SQL:    ${join(outDir, "articles.sql")}`);
console.log(`  Images: ${images.size} referenced -> ${join(outDir, "r2-upload.sh")}`);
