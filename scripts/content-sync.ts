/**
 * Mirror the D1 content into the deployment's Git repository.
 *
 *   bun run content:sync -- --config=wrangler.deploy.jsonc [--out=content] [--all]
 *
 * By default only published articles are written, which is safe for a public
 * repository. `--all` includes drafts and must only be used with a private
 * repository. Images are never copied: only their metadata (key, dimensions,
 * alt) is written to `media.json`.
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderArticleMirror } from "../src/lib/content-mirror";
import { mediaKeysInMarkdown } from "../src/lib/media";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);

const config = args.get("config") ?? "wrangler.deploy.jsonc";
const outDir = args.get("out") ?? "content";
const all = args.has("all");

interface ArticleRow {
  slug: string;
  title: string;
  description: string;
  body_mdx: string;
  status: string;
  lang: string;
  published_at: string | null;
  updated_at: string | null;
  og_image_key: string | null;
  category_slug: string | null;
  cover_alt: string | null;
}

interface MediaRow {
  r2_key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

interface CategoryRow {
  slug: string;
  name: string;
  description: string | null;
  position: number;
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

  if (result.exitCode !== 0) {
    throw new Error(`D1 query failed: ${sql}`);
  }

  const text = result.stdout.toString();
  const start = text.indexOf("[");
  if (start === -1) throw new Error(`Unexpected D1 output: ${text.slice(0, 200)}`);
  return (JSON.parse(text.slice(start))[0].results ?? []) as T[];
}

const articles = query<ArticleRow>(
  `SELECT a.slug, a.title, a.description, a.body_mdx, a.status, a.lang,
          a.published_at, a.updated_at, a.og_image_key,
          c.slug AS category_slug, m.alt AS cover_alt
   FROM articles a
   LEFT JOIN categories c ON c.id = a.category_id
   LEFT JOIN media m ON m.r2_key = a.og_image_key
   ORDER BY a.slug`,
).filter((article) => all || article.status === "published");

const categories = query<CategoryRow>(
  "SELECT slug, name, description, position FROM categories ORDER BY position ASC, name ASC",
);

const selectedMedia = new Set<string>();
for (const article of articles) {
  if (article.og_image_key) selectedMedia.add(article.og_image_key);
  for (const key of mediaKeysInMarkdown(article.body_mdx)) selectedMedia.add(key);
}

const media = query<MediaRow>(
  "SELECT r2_key, width, height, alt FROM media ORDER BY r2_key",
).filter((row) => all || selectedMedia.has(row.r2_key));

await rm(join(outDir, "articles"), { recursive: true, force: true });
await mkdir(join(outDir, "articles"), { recursive: true });

for (const article of articles) {
  const body = renderArticleMirror({
    slug: article.slug,
    title: article.title,
    description: article.description,
    status: article.status === "draft" ? "draft" : "published",
    lang: article.lang,
    publishedAt: article.published_at,
    updatedAt: article.updated_at,
    imageKey: article.og_image_key,
    imageAlt: article.cover_alt,
    category: article.category_slug,
    bodyMdx: article.body_mdx,
  });
  await writeFile(join(outDir, "articles", `${article.slug}.mdx`), body, "utf8");
}

await writeFile(
  join(outDir, "categories.json"),
  `${JSON.stringify(categories, null, 2)}\n`,
  "utf8",
);
await writeFile(join(outDir, "media.json"), `${JSON.stringify(media, null, 2)}\n`, "utf8");
await writeFile(
  join(outDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: all ? "all" : "published",
      articles: articles.map((article) => article.slug),
      media: media.map((row) => row.r2_key),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `Synced ${articles.length} article(s) and ${media.length} media row(s) to ${outDir} (${all ? "all statuses" : "published only"}).`,
);
