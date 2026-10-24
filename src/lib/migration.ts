import matter from "gray-matter";

/**
 * Helpers for migrating the old blog's Markdown into D1. The blog stored
 * articles as `.md` files in a private repository; these functions turn a file
 * into a row and rewrite image paths to the R2 media route.
 */

export interface BlogFrontmatter {
  title?: string;
  date?: string;
  dateModified?: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  description?: string;
}

export interface MigratedArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyMdx: string;
  bodyHtml: string;
  status: "published";
  lang: string;
  ogImageKey: string | null;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
}

export function slugFromFilename(filename: string): string {
  return filename.replace(/\.(md|mdx)$/i, "");
}

export function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** `/images/x.webp` (or an absolute URL to it) becomes the media key `images/x.webp`. */
export function mediaKeyFromImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  let pathname = url;
  try {
    pathname = url.startsWith("http") ? new URL(url).pathname : url;
  } catch {
    return null;
  }
  const match = pathname.match(/\/images\/(.+)$/);
  return match ? `images/${match[1]}` : null;
}

/** Rewrite `/images/<name>` to the trailing-slash media route. */
export function rewriteImageUrls(text: string): string {
  return text.replace(/\/images\/([^"')\s]+)/g, "/media/images/$1/");
}

/** Media keys referenced by the article body. */
export function referencedImages(text: string): string[] {
  const keys = new Set<string>();
  for (const match of text.matchAll(/\/images\/([^"')\s]+)/g)) {
    keys.add(`images/${match[1]}`);
  }
  return [...keys];
}

export function deriveDescription(markdown: string, max = 160): string {
  const text = markdown
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`_>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export interface ParsedFile {
  article: MigratedArticle;
  images: string[];
  /** `imageAlt` from the frontmatter, for the cover media row. */
  coverAlt: string | null;
}

export function parseArticleFile(filename: string, raw: string, locale = "fr"): ParsedFile {
  const { data, content } = matter(raw) as { data: BlogFrontmatter; content: string };
  const slug = slugFromFilename(filename);
  const bodyMdx = rewriteImageUrls(content.trim());
  const images = referencedImages(content);

  const coverKey = mediaKeyFromImageUrl(data.image);
  if (coverKey) images.push(coverKey);

  const article: MigratedArticle = {
    id: slug,
    slug,
    title: data.title?.trim() || slug,
    description: data.description?.trim() || deriveDescription(content),
    bodyMdx,
    bodyHtml: "", // filled by the migration script after compiling MDX
    status: "published",
    lang: locale,
    ogImageKey: coverKey,
    author: data.author?.trim() || null,
    publishedAt: toIso(data.date),
    updatedAt: toIso(data.dateModified) ?? toIso(data.date),
  };

  return {
    article,
    images: [...new Set(images)],
    coverAlt: coverKey ? (data.imageAlt?.trim() ?? null) : null,
  };
}

function sqlValue(value: string | null): string {
  return value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`;
}

/** INSERT statements for the migrated articles. */
export function toInsertSql(articles: MigratedArticle[]): string {
  const rows = articles.map(
    (a) =>
      `INSERT INTO articles (id, slug, title, description, body_mdx, body_html, status, lang, og_image_key, author, published_at, updated_at) VALUES (${sqlValue(
        a.id,
      )}, ${sqlValue(a.slug)}, ${sqlValue(a.title)}, ${sqlValue(a.description)}, ${sqlValue(
        a.bodyMdx,
      )}, ${sqlValue(a.bodyHtml)}, 'published', ${sqlValue(a.lang)}, ${sqlValue(
        a.ogImageKey,
      )}, ${sqlValue(a.author)}, ${sqlValue(a.publishedAt)}, ${sqlValue(a.updatedAt)});`,
  );

  // D1 does not allow explicit BEGIN/COMMIT; wrangler applies the file as a
  // batch.
  return [...rows, ""].join("\n");
}

export interface MigratedMedia {
  r2Key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

/** INSERT statements for the migrated media rows (dimensions prevent CLS). */
export function toMediaInsertSql(media: MigratedMedia[]): string {
  const rows = media.map(
    (item) =>
      `INSERT INTO media (id, r2_key, width, height, alt) VALUES (${sqlValue(item.r2Key)}, ${sqlValue(
        item.r2Key,
      )}, ${item.width ?? "NULL"}, ${item.height ?? "NULL"}, ${sqlValue(item.alt)});`,
  );
  return [...rows, ""].join("\n");
}
