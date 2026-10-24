import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface UpdateBody {
  name?: string;
  slug?: string;
  position?: number;
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
  if (!(await content.getCategoryById(id))) {
    return json({ error: "Catégorie introuvable." }, 404);
  }

  const body = (await request.json()) as UpdateBody;
  const category = await content.updateCategory(id, {
    name: body.name?.trim() || undefined,
    slug: body.slug,
    position: body.position,
  });

  return json(category);
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: "Identifiant manquant." }, 400);

  const content = createContent(env.DB);
  if (!(await content.getCategoryById(id))) {
    return json({ error: "Catégorie introuvable." }, 404);
  }

  await content.deleteCategory(id);
  return json({ ok: true });
};
