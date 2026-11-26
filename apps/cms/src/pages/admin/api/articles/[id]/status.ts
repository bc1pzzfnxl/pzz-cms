import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiError, apiOk, notFoundError } from "../../../../../lib/api";

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing article id.", 400);

  const content = createContent(env.DB);
  if (!(await content.getArticleById(id))) return notFoundError("Article not found.");

  const body = (await request.json()) as { status?: string };
  if (body.status !== "published" && body.status !== "draft") {
    return apiError("VALIDATION", "status must be 'draft' or 'published'.", 400, {
      issues: [{ path: "status", message: "status must be 'draft' or 'published'." }],
    });
  }

  const article = await content.setStatus(id, body.status);
  return apiOk({ id: article.id, slug: article.slug, status: article.status, rev: article.rev });
};
