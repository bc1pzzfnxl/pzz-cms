import { env } from "cloudflare:workers";
import type { Article } from "@pzz-cms/core";
import {
  type Content,
  createContent,
  deleteMediaObjects,
  mediaKeysInHtml,
  mediaKeysInMarkdown,
  RevisionConflictError,
} from "@pzz-cms/core";
import type { APIRoute } from "astro";
import {
  apiError,
  apiOk,
  conflictError,
  notFoundError,
  parseRev,
  validationError,
} from "../../../../lib/api";

interface UpdateBody {
  title?: string;
  slug?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  ogImageKey?: string | null;
  coverAlt?: string | null;
  categoryId?: string | null;
  rev?: number;
}

function articleMediaKeys(article: Article): Set<string> {
  return new Set([
    ...(article.ogImageKey ? [article.ogImageKey] : []),
    ...mediaKeysInHtml(article.bodyHtml),
    ...mediaKeysInMarkdown(article.bodyMdx),
  ]);
}

/**
 * Delete media that this save removed from the article (old cover or images
 * dropped from the body), unless another article/document still references it.
 * Cleanup failures never fail the save.
 */
async function cleanupRemovedMedia(
  content: Content,
  before: Article,
  after: Article,
): Promise<void> {
  const previous = articleMediaKeys(before);
  const current = articleMediaKeys(after);

  for (const key of previous) {
    if (current.has(key)) continue;
    try {
      if (await content.isMediaReferenced(key)) continue;
      await deleteMediaObjects(env.MEDIA, key);
      await content.deleteMedia(key);
    } catch (error) {
      console.error(`Media cleanup failed for ${key}`, error);
    }
  }
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing article id.", 400);

  const content = createContent(env.DB);
  const existing = await content.getArticleById(id);
  if (!existing) return notFoundError("Article not found.");

  const body = (await request.json()) as UpdateBody;
  const rev = parseRev(body.rev);
  if (rev !== undefined && typeof rev !== "number") return validationError([rev]);

  let article: Article;
  try {
    article = await content.updateArticle(
      id,
      {
        title: body.title,
        slug: body.slug,
        description: body.description,
        bodyMdx: body.bodyMdx,
        bodyHtml: body.bodyHtml,
        ogImageKey: body.ogImageKey,
        categoryId: body.categoryId,
      },
      rev,
    );
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return conflictError(
        "This article was changed elsewhere. Reload to get the latest version.",
        { rev: error.actual },
      );
    }
    throw error;
  }

  await cleanupRemovedMedia(content, existing, article);

  if (article.ogImageKey && body.coverAlt !== undefined) {
    await content.updateMediaAlt(article.ogImageKey, body.coverAlt?.trim() || null);
  }

  return apiOk({ id: article.id, slug: article.slug, status: article.status, rev: article.rev });
};
