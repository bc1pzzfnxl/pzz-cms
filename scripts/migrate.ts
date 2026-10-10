/**
 * Import the old blog's Markdown into D1.
 *
 *   bun scripts/migrate.ts [contentDir] [outDir]
 *
 * Defaults: contentDir = ../bc1pzzfnxl-blog/src/content, outDir = migration-output
 *
 * It writes `articles.sql` and `media.sql` (apply with wrangler d1 execute) and
 * `r2-upload.sh` (upload the referenced images to R2). Nothing here is
 * committed: the output directory is gitignored, and the articles stay private.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import sharp from "sharp";
import {
  type MigratedArticle,
  type MigratedMedia,
  parseArticleFile,
  toInsertSql,
  toMediaInsertSql,
} from "../src/lib/migration";
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
const imageKeys = new Set<string>();
const alts = new Map<string, string>();

for (const file of files) {
  const raw = await readFile(join(contentDir, file), "utf8");
  const { article, images } = parseArticleFile(basename(file), raw);
  article.bodyHtml = await renderMdxToHtml(article.bodyMdx, {});
  articles.push(article);
  for (const key of images) imageKeys.add(key);

  for (const match of raw.matchAll(/!\[([^\]]*)\]\(\/images\/([^)\s]+)\)/g)) {
    if (match[1]) alts.set(`images/${match[2]}`, match[1]);
  }
}

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "articles.sql"), toInsertSql(articles), "utf8");

const media: MigratedMedia[] = [];
const uploadLines: string[] = [];

for (const key of [...imageKeys].sort()) {
  const name = key.replace(/^images\//, "");
  const filePath = join(imagesDir, name);

  let width: number | null = null;
  let height: number | null = null;
  try {
    const meta = await sharp(filePath).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
  } catch {
    // Missing or unreadable image; leave the dimensions null.
  }

  media.push({ r2Key: key, width, height, alt: alts.get(key) ?? null });
  uploadLines.push(`bunx wrangler r2 object put ${bucket}/${key} --file=${filePath} --local`);
}

await writeFile(join(outDir, "media.sql"), toMediaInsertSql(media), "utf8");
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
console.log(`  Articles: ${join(outDir, "articles.sql")}`);
console.log(`  Media:    ${media.length} row(s) -> ${join(outDir, "media.sql")}`);
console.log(`  Uploads:  ${join(outDir, "r2-upload.sh")}`);
