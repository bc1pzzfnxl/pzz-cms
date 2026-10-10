import { slugify, uniqueSlug } from "../lib/slug";
import type {
  AdminArticleSummary,
  Article,
  ArticleRow,
  ArticleStatus,
  ArticleSummary,
  CreateArticleInput,
  Database,
  Redirect,
  UpdateArticleInput,
} from "./types";

const ARTICLE_COLUMNS =
  "id, slug, title, description, body_mdx, body_html, status, lang, og_image_key, author, published_at, created_at, updated_at";

function now(): string {
  return new Date().toISOString();
}

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
 * public site uses the read methods; the admin uses the write methods.
 */
export interface Content {
  // Public read path
  listPublished(): Promise<ArticleSummary[]>;
  getPublishedBySlug(slug: string): Promise<Article | null>;
  getRedirect(fromPath: string): Promise<Redirect | null>;

  // Admin read path
  listAll(): Promise<AdminArticleSummary[]>;
  getArticleById(id: string): Promise<Article | null>;
  getArticleBySlug(slug: string): Promise<Article | null>;
  listSlugs(): Promise<string[]>;

  // Admin write path
  createArticle(input: CreateArticleInput): Promise<Article>;
  updateArticle(id: string, input: UpdateArticleInput): Promise<Article>;
  setStatus(id: string, status: ArticleStatus): Promise<Article>;
}

export function createContent(db: Database): Content {
  async function getArticleById(id: string): Promise<Article | null> {
    const row = await db
      .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE id = ?`)
      .bind(id)
      .first<ArticleRow>();
    return row ? toArticle(row) : null;
  }

  async function getArticleOrThrow(id: string): Promise<Article> {
    const article = await getArticleById(id);
    if (!article) throw new Error(`Article not found: ${id}`);
    return article;
  }

  async function listSlugs(): Promise<string[]> {
    const { results } = await db.prepare("SELECT slug FROM articles").all<{ slug: string }>();
    return results.map((row) => row.slug);
  }

  return {
    // ── Public read path ──────────────────────────────────────────────────
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

    async getRedirect(fromPath) {
      const row = await db
        .prepare("SELECT from_path, to_path FROM redirects WHERE from_path = ?")
        .bind(fromPath)
        .first<{ from_path: string; to_path: string }>();
      return row ? { fromPath: row.from_path, toPath: row.to_path } : null;
    },

    // ── Admin read path ───────────────────────────────────────────────────
    async listAll() {
      const { results } = await db
        .prepare(
          "SELECT id, slug, title, status, published_at, updated_at FROM articles ORDER BY updated_at DESC",
        )
        .all<{
          id: string;
          slug: string;
          title: string;
          status: string;
          published_at: string | null;
          updated_at: string;
        }>();

      return results.map(
        (row): AdminArticleSummary => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status === "published" ? "published" : "draft",
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
        }),
      );
    },

    getArticleById,

    async getArticleBySlug(slug) {
      const row = await db
        .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles WHERE slug = ?`)
        .bind(slug)
        .first<ArticleRow>();
      return row ? toArticle(row) : null;
    },

    async listSlugs() {
      return listSlugs();
    },

    // ── Admin write path ──────────────────────────────────────────────────
    async createArticle(input) {
      const id = crypto.randomUUID();
      const slug = uniqueSlug(slugify(input.slug ?? input.title), await listSlugs());
      const status: ArticleStatus = input.status ?? "draft";
      const publishedAt = status === "published" ? now() : null;

      await db
        .prepare(
          "INSERT INTO articles (id, slug, title, description, body_mdx, body_html, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          slug,
          input.title,
          input.description ?? "",
          input.bodyMdx ?? "",
          input.bodyHtml ?? "",
          status,
          publishedAt,
        )
        .run();

      return getArticleOrThrow(id);
    },

    async updateArticle(id, input) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (input.title !== undefined) {
        sets.push("title = ?");
        values.push(input.title);
      }
      if (input.slug !== undefined) {
        sets.push("slug = ?");
        values.push(slugify(input.slug));
      }
      if (input.description !== undefined) {
        sets.push("description = ?");
        values.push(input.description);
      }
      if (input.bodyMdx !== undefined) {
        sets.push("body_mdx = ?");
        values.push(input.bodyMdx);
      }
      if (input.bodyHtml !== undefined) {
        sets.push("body_html = ?");
        values.push(input.bodyHtml);
      }
      if (input.ogImageKey !== undefined) {
        sets.push("og_image_key = ?");
        values.push(input.ogImageKey);
      }

      sets.push("updated_at = ?");
      values.push(now(), id);

      await db
        .prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();

      return getArticleOrThrow(id);
    },

    async setStatus(id, status) {
      if (status === "published") {
        const timestamp = now();
        await db
          .prepare(
            "UPDATE articles SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?",
          )
          .bind(timestamp, timestamp, id)
          .run();
      } else {
        await db
          .prepare("UPDATE articles SET status = 'draft', updated_at = ? WHERE id = ?")
          .bind(now(), id)
          .run();
      }

      return getArticleOrThrow(id);
    },
  };
}
