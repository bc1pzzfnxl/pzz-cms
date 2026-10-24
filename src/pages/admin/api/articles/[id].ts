import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { type Content, createContent } from "@/content";
import type { Article } from "@/content/types";
import { deleteMediaObjects, mediaKeysInHtml, mediaKeysInMarkdown } from "@/lib/media";

interface UpdateBody {
  title?: string;
  slug?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  ogImageKey?: string | null;
  coverAlt?: string | null;
  categoryId?: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
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
  if (!id) return json({ error: "Identifiant manquant." }, 400);

  const content = createContent(env.DB);
  const existing = await content.getArticleById(id);
  if (!existing) {
    return json({ error: "Article introuvable." }, 404);
  }

  const body = (await request.json()) as UpdateBody;
  const article = await content.updateArticle(id, {
    title: body.title,
    slug: body.slug,
    description: body.description,
    bodyMdx: body.bodyMdx,
    bodyHtml: body.bodyHtml,
    ogImageKey: body.ogImageKey,
    categoryId: body.categoryId,
  });

  await cleanupRemovedMedia(content, existing, article);

  if (article.ogImageKey && body.coverAlt !== undefined) {
    await content.updateMediaAlt(article.ogImageKey, body.coverAlt?.trim() || null);
  }

  return json({ id: article.id, slug: article.slug, status: article.status });
};
