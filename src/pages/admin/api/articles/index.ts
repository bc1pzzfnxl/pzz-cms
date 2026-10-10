import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface CreateBody {
  title?: string;
  description?: string;
  bodyMdx?: string;
  bodyHtml?: string;
  ogImageKey?: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as CreateBody;

  if (!body.title?.trim()) {
    return json({ error: "Le titre est obligatoire." }, 400);
  }

  const article = await content.createArticle({
    title: body.title.trim(),
    description: body.description,
    bodyMdx: body.bodyMdx,
    bodyHtml: body.bodyHtml,
    ogImageKey: body.ogImageKey,
  });

  return json({ id: article.id, slug: article.slug }, 201);
};
