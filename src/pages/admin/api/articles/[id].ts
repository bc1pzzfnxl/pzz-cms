import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface UpdateBody {
  title?: string;
  slug?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  categoryId?: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "Identifiant manquant." }, 400);

  const content = createContent(env.DB);
  if (!(await content.getArticleById(id))) {
    return json({ error: "Article introuvable." }, 404);
  }

  const body = (await request.json()) as UpdateBody;
  const article = await content.updateArticle(id, {
    title: body.title,
    slug: body.slug,
    description: body.description,
    bodyMdx: body.bodyMdx,
    bodyHtml: body.bodyHtml,
    categoryId: body.categoryId,
  });

  return json({ id: article.id, slug: article.slug, status: article.status });
};
