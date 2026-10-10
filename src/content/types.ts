/**
 * Minimal structural interface over a Cloudflare D1 database. The content
 * module depends on this, not on the concrete `D1Database` type, so it can be
 * driven by a real D1 binding at runtime and by an in-memory SQLite database in
 * tests. `D1Database` satisfies it as-is.
 */
export interface PreparedStatement {
  bind(...values: unknown[]): PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface Database {
  prepare(query: string): PreparedStatement;
}

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  bodyMdx: string;
  /** MDX pre-rendered to HTML at save time (Workers cannot run the MDX compiler). */
  bodyHtml: string;
  status: ArticleStatus;
  lang: string;
  ogImageKey: string | null;
  author: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The fields a listing needs. Kept small so index queries stay cheap. */
export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string | null;
}

/** Admin listing row: includes drafts and status. */
export interface AdminArticleSummary {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface CreateArticleInput {
  title: string;
  slug?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  status?: ArticleStatus;
  ogImageKey?: string | null;
}

export interface UpdateArticleInput {
  title?: string;
  slug?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  ogImageKey?: string | null;
}

export interface Redirect {
  fromPath: string;
  toPath: string;
}

export interface Media {
  id: string;
  r2Key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
}

export interface CreateMediaInput {
  r2Key: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

/** Shape of a `media` row as stored in D1. */
export interface MediaRow {
  id: string;
  r2_key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: string;
}

/** Shape of an `articles` row as stored in D1. */
export interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  body_mdx: string;
  body_html: string;
  status: string;
  lang: string;
  og_image_key: string | null;
  author: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
