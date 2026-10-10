import type { Article, ArticleRow, ArticleSummary, Database, Redirect } from "./types";

const ARTICLE_COLUMNS =
  "id, slug, title, description, body_mdx, body_html, status, lang, og_image_key, author, published_at, created_at, updated_at";

function toArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    bodyMdx: row.body_mdx,
    bodyHtml: row.body_html,
    status: row.status === "published" ? "published" : "draft",
    lang: row.lang,
    ogImageKey: row.og_image_key,
    author: row.author,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The content module. It is the only place that talks to the database. The
 * public site uses `listPublished` and `getPublishedBySlug`; the admin will use
 * the draft-aware methods added in P2.
 */
export interface Content {
  listPublished(): Promise<ArticleSummary[]>;
  getPublishedBySlug(slug: string): Promise<Article | null>;
  getArticleBySlug(slug: string): Promise<Article | null>;
  getRedirect(fromPath: string): Promise<Redirect | null>;
}

export function createContent(db: Database): Content {
  return {
    async listPublished() {
      const { results } = await db
        .prepare(
          "SELECT slug, title, description, published_at FROM articles WHERE status = 'published' ORDER BY published_at DESC",
        )
        .all<Pick<ArticleRow, "slug" | "title" | "description" | "published_at">>();

      return results.map(
        (row): ArticleSummary => ({
          slug: row.slug,
          title: row.title,
          description: row.description,
          publishedAt: row.published_at,
        }),
      );
    },

    async getPublishedBySlug(slug) {
      const row = await db
        .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE slug = ? AND status = 'published'`)
        .bind(slug)
        .first<ArticleRow>();
      return row ? toArticle(row) : null;
    },

    async getArticleBySlug(slug) {
      const row = await db
        .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE slug = ?`)
        .bind(slug)
        .first<ArticleRow>();
      return row ? toArticle(row) : null;
    },

    async getRedirect(fromPath) {
      const row = await db
        .prepare("SELECT from_path, to_path FROM redirects WHERE from_path = ?")
        .bind(fromPath)
        .first<{ from_path: string; to_path: string }>();
      return row ? { fromPath: row.from_path, toPath: row.to_path } : null;
    },
  };
}
