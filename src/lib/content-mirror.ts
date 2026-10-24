import matter from "gray-matter";
import type { ArticleStatus } from "../content/types";
import { mediaPublicPath } from "./media";
import { mediaKeyFromImageUrl } from "./migration";

export interface MirrorArticle {
  slug: string;
  title: string;
  description: string;
  status: ArticleStatus;
  lang: string;
  publishedAt: string | null;
  updatedAt: string | null;
  imageKey: string | null;
  imageAlt: string | null;
  category: string | null;
  bodyMdx: string;
}

/**
 * Render an article as a self-contained `.mdx` file with frontmatter. The
 * mirror is the Git history for text content; images stay in R2.
 */
export function renderArticleMirror(article: MirrorArticle): string {
  const data: Record<string, unknown> = {
    title: article.title,
    slug: article.slug,
    description: article.description,
    status: article.status,
    lang: article.lang,
  };

  if (article.publishedAt) data.publishedAt = article.publishedAt;
  if (article.updatedAt) data.updatedAt = article.updatedAt;
  if (article.imageKey) {
    data.image = mediaPublicPath(article.imageKey);
  }
  if (article.imageAlt) data.imageAlt = article.imageAlt;
  if (article.category) data.category = article.category;

  return matter.stringify(article.bodyMdx.trimEnd(), data);
}

function asString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStatus(value: unknown): ArticleStatus {
  return value === "draft" ? "draft" : "published";
}

/** Parse a mirrored `.mdx` file back into the fields needed to restore it. */
export function parseArticleMirror(raw: string, fallbackSlug?: string): MirrorArticle {
  const { data, content } = matter(raw) as { data: Record<string, unknown>; content: string };
  const slug = asString(data.slug) ?? fallbackSlug;
  const title = asString(data.title);

  if (!slug || !title) {
    throw new Error(`Mirror is missing a slug or title${fallbackSlug ? ` (${fallbackSlug})` : ""}`);
  }

  return {
    slug,
    title,
    description: asString(data.description) ?? "",
    status: asStatus(data.status),
    lang: asString(data.lang) ?? "fr",
    publishedAt: asString(data.publishedAt),
    updatedAt: asString(data.updatedAt),
    imageKey: mediaKeyFromImageUrl(asString(data.image) ?? undefined),
    imageAlt: asString(data.imageAlt),
    category: asString(data.category),
    bodyMdx: content.trim(),
  };
}
