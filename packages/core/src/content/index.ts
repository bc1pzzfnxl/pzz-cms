import { RevisionConflictError } from "../lib/errors";
import { mediaKeysInHtml, mediaKeysInMarkdown } from "../lib/media";
import { slugify, uniqueSlug } from "../lib/slug";
import { DEFAULT_THEME, normalizeTheme, type SiteTheme } from "../lib/theme";
import type {
  AdminArticleSummary,
  AdminDocumentSummary,
  Article,
  ArticleRow,
  ArticleStatus,
  ArticleSummary,
  Category,
  CategoryRow,
  CreateArticleInput,
  CreateCategoryInput,
  CreateDocumentInput,
  CreateMediaInput,
  Database,
  Document,
  DocumentRow,
  Media,
  MediaRow,
  Redirect,
  UpdateArticleInput,
  UpdateCategoryInput,
  UpdateDocumentInput,
} from "./types";

const ARTICLE_COLUMNS =
  "id, slug, title, description, body_mdx, body_html, status, lang, og_image_key, author, category_id, published_at, created_at, updated_at, rev";

const DOCUMENT_COLUMNS =
  "id, slug, title, description, body_json, status, published_at, created_at, updated_at, rev";

/** Drafts untouched for this long show up under "needs attention". */
const STALE_DRAFT_DAYS = 30;

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
    categoryId: row.category_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rev: row.rev,
  };
}

/** Aggregates for the admin dashboard. Read-only, computed in D1. */
export interface DashboardStats {
  articles: { published: number; draft: number };
  documents: { published: number; draft: number };
  media: number;
  categories: number;
  /** Published articles per month, oldest first (six months max). */
  publicationsByMonth: { month: string; count: number }[];
  /** Published article count per category, highest first. */
  byCategory: { id: string; name: string; count: number }[];
  /** Most recently updated articles. */
  recent: AdminArticleSummary[];
}

/** A draft that has not moved for a while. */
export interface StaleDraft {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

/**
 * Work the dashboard can act on: content that is missing something a reader
 * would notice, or that has been left behind.
 */
export interface DashboardAttention {
  /** Drafts untouched for {@link STALE_DRAFT_DAYS} days, oldest first. */
  staleDrafts: StaleDraft[];
  staleDraftCount: number;
  /** Published articles with an empty description (used by search and social). */
  missingDescription: number;
  /** Published articles without a cover image. */
  missingCover: number;
  /** Media rows no article or document references. */
  orphanMedia: number;
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
  getStats(): Promise<DashboardStats>;
  getAttention(): Promise<DashboardAttention>;

  // Site settings (appearance)
  getTheme(): Promise<SiteTheme>;
  saveTheme(theme: SiteTheme): Promise<SiteTheme>;

  // Admin write path
  createArticle(input: CreateArticleInput): Promise<Article>;
  /**
   * Update an article. When `expectedRev` is given, the write only applies if
   * the row still has that revision; otherwise it throws
   * {@link RevisionConflictError}.
   */
  updateArticle(id: string, input: UpdateArticleInput, expectedRev?: number): Promise<Article>;
  setStatus(id: string, status: ArticleStatus): Promise<Article>;

  // Media
  createMedia(input: CreateMediaInput): Promise<Media>;
  getMediaByKey(r2Key: string): Promise<Media | null>;
  updateMediaAlt(r2Key: string, alt: string | null): Promise<Media | null>;
  isMediaReferenced(r2Key: string): Promise<boolean>;
  deleteMedia(r2Key: string): Promise<void>;
  listMedia(): Promise<Media[]>;

  // Categories
  listCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | null>;
  getCategoryBySlug(slug: string): Promise<Category | null>;
  listPublishedByCategory(categoryId: string): Promise<ArticleSummary[]>;
  createCategory(input: CreateCategoryInput): Promise<Category>;
  updateCategory(id: string, input: UpdateCategoryInput): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // JSON documents
  listDocuments(): Promise<AdminDocumentSummary[]>;
  getDocumentById(id: string): Promise<Document | null>;
  getPublishedDocumentBySlug(slug: string): Promise<Document | null>;
  createDocument(input: CreateDocumentInput): Promise<Document>;
  /**
   * Update a document. Same revision contract as {@link updateArticle}.
   */
  updateDocument(id: string, input: UpdateDocumentInput, expectedRev?: number): Promise<Document>;
  setDocumentStatus(id: string, status: ArticleStatus): Promise<Document>;
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

  /**
   * Record a permanent redirect and re-point any redirect that targeted the old
   * path, so chains never build up.
   */
  async function createRedirect(fromPath: string, toPath: string): Promise<void> {
    if (fromPath === toPath) return;
    await db
      .prepare(
        "INSERT INTO redirects (from_path, to_path) VALUES (?, ?) ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path",
      )
      .bind(fromPath, toPath)
      .run();
    await db
      .prepare("UPDATE redirects SET to_path = ? WHERE to_path = ?")
      .bind(toPath, fromPath)
      .run();
  }

  function toCategory(row: CategoryRow): Category {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      position: row.position,
      createdAt: row.created_at,
    };
  }

  async function getCategoryById(id: string): Promise<Category | null> {
    const row = await db
      .prepare(
        "SELECT id, slug, name, description, position, created_at FROM categories WHERE id = ?",
      )
      .bind(id)
      .first<CategoryRow>();
    return row ? toCategory(row) : null;
  }

  async function getCategoryBySlug(slug: string): Promise<Category | null> {
    const row = await db
      .prepare(
        "SELECT id, slug, name, description, position, created_at FROM categories WHERE slug = ?",
      )
      .bind(slug)
      .first<CategoryRow>();
    return row ? toCategory(row) : null;
  }

  async function categorySlugs(): Promise<string[]> {
    const { results } = await db.prepare("SELECT slug FROM categories").all<{ slug: string }>();
    return results.map((row) => row.slug);
  }

  function toMedia(row: MediaRow): Media {
    return {
      id: row.id,
      r2Key: row.r2_key,
      width: row.width,
      height: row.height,
      alt: row.alt,
      createdAt: row.created_at,
    };
  }

  async function getMediaByKey(r2Key: string): Promise<Media | null> {
    const row = await db
      .prepare("SELECT id, r2_key, width, height, alt, created_at FROM media WHERE r2_key = ?")
      .bind(r2Key)
      .first<MediaRow>();
    return row ? toMedia(row) : null;
  }

  function toDocument(row: DocumentRow): Document {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      bodyJson: row.body_json,
      status: row.status === "published" ? "published" : "draft",
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rev: row.rev,
    };
  }

  async function getDocumentById(id: string): Promise<Document | null> {
    const row = await db
      .prepare(`SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE id = ?`)
      .bind(id)
      .first<DocumentRow>();
    return row ? toDocument(row) : null;
  }

  async function documentSlugs(): Promise<string[]> {
    const { results } = await db.prepare("SELECT slug FROM documents").all<{ slug: string }>();
    return results.map((row) => row.slug);
  }

  /** Title from the JSON body (`meta.titre`, `titre`, `title`, `name`), or a fallback. */
  function titleFromJson(bodyJson: string, fallback: string): string {
    try {
      const data = JSON.parse(bodyJson) as Record<string, unknown>;
      const meta = (data.meta ?? data) as Record<string, unknown>;
      const candidate =
        meta.titre ?? meta.title ?? meta.name ?? data.titre ?? data.title ?? data.name;
      return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
    } catch {
      return fallback;
    }
  }

  return {
    // ── Public read path ──────────────────────────────────────────────────
    async listPublished() {
      const { results } = await db
        .prepare(
          `SELECT a.slug, a.title, a.description, a.published_at, a.category_id,
                  c.slug AS category_slug, c.name AS category_name
           FROM articles a
           LEFT JOIN categories c ON c.id = a.category_id
           WHERE a.status = 'published'
           ORDER BY a.published_at DESC`,
        )
        .all<{
          slug: string;
          title: string;
          description: string;
          published_at: string | null;
          category_id: string | null;
          category_slug: string | null;
          category_name: string | null;
        }>();

      return results.map(
        (row): ArticleSummary => ({
          slug: row.slug,
          title: row.title,
          description: row.description,
          publishedAt: row.published_at,
          category:
            row.category_id && row.category_slug && row.category_name
              ? { id: row.category_id, slug: row.category_slug, name: row.category_name }
              : null,
        }),
      );
    },

    async listPublishedByCategory(categoryId) {
      const { results } = await db
        .prepare(
          `SELECT a.slug, a.title, a.description, a.published_at, a.category_id,
                  c.slug AS category_slug, c.name AS category_name
           FROM articles a
           JOIN categories c ON c.id = a.category_id
           WHERE a.status = 'published' AND a.category_id = ?
           ORDER BY a.published_at DESC`,
        )
        .bind(categoryId)
        .all<{
          slug: string;
          title: string;
          description: string;
          published_at: string | null;
          category_id: string;
          category_slug: string;
          category_name: string;
        }>();

      return results.map(
        (row): ArticleSummary => ({
          slug: row.slug,
          title: row.title,
          description: row.description,
          publishedAt: row.published_at,
          category: { id: row.category_id, slug: row.category_slug, name: row.category_name },
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
          "SELECT id, slug, title, status, category_id, published_at, updated_at FROM articles ORDER BY updated_at DESC",
        )
        .all<{
          id: string;
          slug: string;
          title: string;
          status: string;
          category_id: string | null;
          published_at: string | null;
          updated_at: string;
        }>();

      return results.map(
        (row): AdminArticleSummary => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status === "published" ? "published" : "draft",
          categoryId: row.category_id,
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
          "INSERT INTO articles (id, slug, title, description, body_mdx, body_html, status, og_image_key, category_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          slug,
          input.title,
          input.description ?? "",
          input.bodyMdx ?? "",
          input.bodyHtml ?? "",
          status,
          input.ogImageKey ?? null,
          input.categoryId ?? null,
          publishedAt,
        )
        .run();

      return getArticleOrThrow(id);
    },

    async updateArticle(id, input, expectedRev) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (input.title !== undefined) {
        sets.push("title = ?");
        values.push(input.title);
      }
      if (input.slug !== undefined) {
        const current = await getArticleById(id);
        const base = slugify(input.slug);
        const taken = (await listSlugs()).filter((slug) => slug !== current?.slug);
        const nextSlug = uniqueSlug(base, taken);

        if (current && nextSlug !== current.slug && current.status === "published") {
          await createRedirect(`/${current.slug}/`, `/${nextSlug}/`);
        }

        sets.push("slug = ?");
        values.push(nextSlug);
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
      if (input.categoryId !== undefined) {
        sets.push("category_id = ?");
        values.push(input.categoryId);
      }

      sets.push("updated_at = ?", "rev = rev + 1");
      values.push(now());

      if (expectedRev !== undefined) {
        values.push(id, expectedRev);
        const result = (await db
          .prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ? AND rev = ?`)
          .bind(...values)
          .run()) as { meta?: { changes?: number } };

        if (result.meta?.changes === 0) {
          const current = await getArticleById(id);
          if (!current) throw new Error(`Article not found: ${id}`);
          throw new RevisionConflictError(id, expectedRev, current.rev);
        }
      } else {
        values.push(id);
        await db
          .prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...values)
          .run();
      }

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

    // ── Media ─────────────────────────────────────────────────────────────
    async createMedia(input) {
      const id = crypto.randomUUID();
      await db
        .prepare("INSERT INTO media (id, r2_key, width, height, alt) VALUES (?, ?, ?, ?, ?)")
        .bind(id, input.r2Key, input.width ?? null, input.height ?? null, input.alt ?? null)
        .run();

      const media = await getMediaByKey(input.r2Key);
      if (!media) throw new Error(`Media not found after insert: ${input.r2Key}`);
      return media;
    },

    async updateMediaAlt(r2Key, alt) {
      await db.prepare("UPDATE media SET alt = ? WHERE r2_key = ?").bind(alt, r2Key).run();
      return getMediaByKey(r2Key);
    },

    async isMediaReferenced(r2Key) {
      const pattern = `%${r2Key}%`;
      const row = await db
        .prepare(
          `SELECT 1 AS used FROM articles
           WHERE og_image_key = ? OR body_mdx LIKE ? OR body_html LIKE ?
           UNION ALL
           SELECT 1 AS used FROM documents WHERE body_json LIKE ?
           LIMIT 1`,
        )
        .bind(r2Key, pattern, pattern, pattern)
        .first<{ used: number }>();
      return Boolean(row);
    },

    async deleteMedia(r2Key) {
      await db.prepare("DELETE FROM media WHERE r2_key = ?").bind(r2Key).run();
    },

    async listMedia() {
      const { results } = await db
        .prepare(
          "SELECT id, r2_key, width, height, alt, created_at FROM media ORDER BY created_at ASC",
        )
        .all<MediaRow>();
      return results.map(toMedia);
    },

    async getStats() {
      const count = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;

      const [
        articlesPublished,
        articlesDraft,
        documentsPublished,
        documentsDraft,
        media,
        categories,
      ] = await Promise.all([
        count("SELECT COUNT(*) AS n FROM articles WHERE status = 'published'"),
        count("SELECT COUNT(*) AS n FROM articles WHERE status = 'draft'"),
        count("SELECT COUNT(*) AS n FROM documents WHERE status = 'published'"),
        count("SELECT COUNT(*) AS n FROM documents WHERE status = 'draft'"),
        count("SELECT COUNT(*) AS n FROM media"),
        count("SELECT COUNT(*) AS n FROM categories"),
      ]);

      const { results: months } = await db
        .prepare(
          `SELECT substr(published_at, 1, 7) AS month, COUNT(*) AS n
           FROM articles
           WHERE status = 'published' AND published_at IS NOT NULL
           GROUP BY month
           ORDER BY month DESC
           LIMIT 6`,
        )
        .all<{ month: string; n: number }>();

      const { results: perCategory } = await db
        .prepare(
          `SELECT c.id AS id, c.name AS name, COUNT(a.id) AS n
           FROM categories c
           LEFT JOIN articles a ON a.category_id = c.id AND a.status = 'published'
           GROUP BY c.id
           ORDER BY n DESC, c.position ASC, c.name ASC`,
        )
        .all<{ id: string; name: string; n: number }>();

      const { results: recent } = await db
        .prepare(
          "SELECT id, slug, title, status, category_id, published_at, updated_at FROM articles ORDER BY updated_at DESC LIMIT 5",
        )
        .all<{
          id: string;
          slug: string;
          title: string;
          status: string;
          category_id: string | null;
          published_at: string | null;
          updated_at: string | null;
        }>();

      return {
        articles: { published: articlesPublished, draft: articlesDraft },
        documents: { published: documentsPublished, draft: documentsDraft },
        media,
        categories,
        publicationsByMonth: months.map((row) => ({ month: row.month, count: row.n })).reverse(),
        byCategory: perCategory.map((row) => ({ id: row.id, name: row.name, count: row.n })),
        recent: recent.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status === "published" ? "published" : "draft",
          categoryId: row.category_id,
          publishedAt: row.published_at,
          updatedAt: row.updated_at ?? "",
        })),
      };
    },

    async getAttention() {
      const threshold = new Date(Date.now() - STALE_DRAFT_DAYS * 86_400_000).toISOString();

      const [stale, staleCount, missingDescription, missingCover] = await Promise.all([
        db
          .prepare(
            "SELECT id, title, slug, updated_at FROM articles WHERE status = 'draft' AND updated_at < ? ORDER BY updated_at ASC LIMIT 5",
          )
          .bind(threshold)
          .all<{ id: string; title: string; slug: string; updated_at: string }>(),
        db
          .prepare("SELECT COUNT(*) AS n FROM articles WHERE status = 'draft' AND updated_at < ?")
          .bind(threshold)
          .first<{ n: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM articles WHERE status = 'published' AND (description IS NULL OR trim(description) = '')",
          )
          .first<{ n: number }>(),
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM articles WHERE status = 'published' AND og_image_key IS NULL",
          )
          .first<{ n: number }>(),
      ]);

      // Media nothing points at any more: one scan of every body, compared
      // with the media table. Cheap for a blog and avoids a query per file.
      const { results: mediaRows } = await db
        .prepare("SELECT r2_key FROM media")
        .all<{ r2_key: string }>();
      const { results: articleRows } = await db
        .prepare("SELECT og_image_key, body_mdx, body_html FROM articles")
        .all<{ og_image_key: string | null; body_mdx: string; body_html: string }>();
      const { results: documentRows } = await db
        .prepare("SELECT body_json FROM documents")
        .all<{ body_json: string }>();

      const referenced = new Set<string>();
      for (const row of articleRows) {
        if (row.og_image_key) referenced.add(row.og_image_key);
        for (const key of mediaKeysInHtml(row.body_html)) referenced.add(key);
        for (const key of mediaKeysInMarkdown(row.body_mdx)) referenced.add(key);
      }
      for (const row of documentRows) {
        for (const key of mediaKeysInMarkdown(row.body_json)) referenced.add(key);
      }

      return {
        staleDrafts: stale.results.map(
          (row): StaleDraft => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            updatedAt: row.updated_at,
          }),
        ),
        staleDraftCount: staleCount?.n ?? 0,
        missingDescription: missingDescription?.n ?? 0,
        missingCover: missingCover?.n ?? 0,
        orphanMedia: mediaRows.filter((row) => !referenced.has(row.r2_key)).length,
      };
    },

    // ── Site settings ─────────────────────────────────────────────────────
    async getTheme() {
      const row = await db
        .prepare("SELECT value FROM settings WHERE key = 'theme'")
        .first<{ value: string }>();
      if (!row) return normalizeTheme(DEFAULT_THEME);
      try {
        return normalizeTheme(JSON.parse(row.value));
      } catch {
        return normalizeTheme(DEFAULT_THEME);
      }
    },

    async saveTheme(theme) {
      const normalized = normalizeTheme(theme);
      await db
        .prepare(
          "INSERT INTO settings (key, value, updated_at) VALUES ('theme', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        )
        .bind(JSON.stringify(normalized), now())
        .run();
      return normalized;
    },

    getMediaByKey,

    // ── Categories ────────────────────────────────────────────────────────
    async listCategories() {
      const { results } = await db
        .prepare(
          "SELECT id, slug, name, description, position, created_at FROM categories ORDER BY position ASC, name ASC",
        )
        .all<CategoryRow>();
      return results.map(toCategory);
    },

    getCategoryById,
    getCategoryBySlug,

    async createCategory(input) {
      const id = crypto.randomUUID();
      const slug = uniqueSlug(slugify(input.slug ?? input.name), await categorySlugs());
      const { results } = await db
        .prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM categories")
        .all<{ next: number }>();

      await db
        .prepare(
          "INSERT INTO categories (id, slug, name, description, position) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          id,
          slug,
          input.name,
          input.description?.trim() || null,
          input.position ?? results[0]?.next ?? 0,
        )
        .run();

      const category = await getCategoryById(id);
      if (!category) throw new Error(`Category not found after insert: ${id}`);
      return category;
    },

    async updateCategory(id, input) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (input.name !== undefined) {
        sets.push("name = ?");
        values.push(input.name);
      }
      if (input.slug !== undefined) {
        const base = slugify(input.slug);
        const taken = (await categorySlugs()).filter((slug) => slug !== input.slug);
        sets.push("slug = ?");
        values.push(uniqueSlug(base, taken));
      }
      if (input.description !== undefined) {
        sets.push("description = ?");
        values.push(input.description?.trim() || null);
      }
      if (input.position !== undefined) {
        sets.push("position = ?");
        values.push(input.position);
      }

      if (sets.length > 0) {
        values.push(id);
        await db
          .prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...values)
          .run();
      }

      const category = await getCategoryById(id);
      if (!category) throw new Error(`Category not found: ${id}`);
      return category;
    },

    async deleteCategory(id) {
      await db
        .prepare("UPDATE articles SET category_id = NULL WHERE category_id = ?")
        .bind(id)
        .run();
      await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
    },

    // ── JSON documents ────────────────────────────────────────────────────
    async listDocuments() {
      const { results } = await db
        .prepare(
          "SELECT id, slug, title, status, published_at, updated_at FROM documents ORDER BY updated_at DESC",
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
        (row): AdminDocumentSummary => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status === "published" ? "published" : "draft",
          publishedAt: row.published_at,
          updatedAt: row.updated_at,
        }),
      );
    },

    getDocumentById,

    async getPublishedDocumentBySlug(slug) {
      const row = await db
        .prepare(
          `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE slug = ? AND status = 'published'`,
        )
        .bind(slug)
        .first<DocumentRow>();
      return row ? toDocument(row) : null;
    },

    async createDocument(input) {
      const id = crypto.randomUUID();
      const base = slugify(input.filename.replace(/\.json$/i, "")) || "document";
      const slug = uniqueSlug(base, await documentSlugs());
      const title = input.title?.trim() || titleFromJson(input.bodyJson, slug);

      await db
        .prepare(
          "INSERT INTO documents (id, slug, title, description, body_json, status, published_at) VALUES (?, ?, ?, ?, ?, 'published', ?)",
        )
        .bind(id, slug, title, input.description ?? "", input.bodyJson, now())
        .run();

      const document = await getDocumentById(id);
      if (!document) throw new Error(`Document not found after insert: ${id}`);
      return document;
    },

    async updateDocument(id, input, expectedRev) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (input.title !== undefined) {
        sets.push("title = ?");
        values.push(input.title);
      }
      if (input.slug !== undefined) {
        const base = slugify(input.slug);
        const taken = (await documentSlugs()).filter((slug) => slug !== input.slug);
        sets.push("slug = ?");
        values.push(uniqueSlug(base, taken));
      }
      if (input.description !== undefined) {
        sets.push("description = ?");
        values.push(input.description);
      }
      if (input.bodyJson !== undefined) {
        sets.push("body_json = ?");
        values.push(input.bodyJson);
      }

      sets.push("updated_at = ?", "rev = rev + 1");
      values.push(now());

      if (expectedRev !== undefined) {
        values.push(id, expectedRev);
        const result = (await db
          .prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ? AND rev = ?`)
          .bind(...values)
          .run()) as { meta?: { changes?: number } };

        if (result.meta?.changes === 0) {
          const current = await getDocumentById(id);
          if (!current) throw new Error(`Document not found: ${id}`);
          throw new RevisionConflictError(id, expectedRev, current.rev);
        }
      } else {
        values.push(id);
        await db
          .prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`)
          .bind(...values)
          .run();
      }

      const document = await getDocumentById(id);
      if (!document) throw new Error(`Document not found: ${id}`);
      return document;
    },

    async setDocumentStatus(id, status) {
      if (status === "published") {
        const timestamp = now();
        await db
          .prepare(
            "UPDATE documents SET status = 'published', published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?",
          )
          .bind(timestamp, timestamp, id)
          .run();
      } else {
        await db
          .prepare("UPDATE documents SET status = 'draft', updated_at = ? WHERE id = ?")
          .bind(now(), id)
          .run();
      }

      const document = await getDocumentById(id);
      if (!document) throw new Error(`Document not found: ${id}`);
      return document;
    },
  };
}
