import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiOk, issues, requiredText, validationError } from "../../../../lib/api";

interface CreateBody {
  title?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  ogImageKey?: string | null;
  coverAlt?: string | null;
  categoryId?: string | null;
}

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as CreateBody;

  const problems = issues(requiredText(body.title, "title", "The title"));
  if (problems.length > 0) return validationError(problems);

  const article = await content.createArticle({
    title: (body.title as string).trim(),
    description: body.description,
    bodyMdx: body.bodyMdx,
    bodyHtml: body.bodyHtml,
    ogImageKey: body.ogImageKey,
    categoryId: body.categoryId,
  });

  if (article.ogImageKey && body.coverAlt !== undefined) {
    await content.updateMediaAlt(article.ogImageKey, body.coverAlt?.trim() || null);
  }

  return apiOk({ id: article.id, slug: article.slug, rev: article.rev }, 201);
};
