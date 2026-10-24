import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface CreateBody {
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

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  return json(await content.listCategories());
};

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as CreateBody;

  if (!body.name?.trim()) {
    return json({ error: "Le nom est obligatoire." }, 400);
  }

  const category = await content.createCategory({
    name: body.name.trim(),
    slug: body.slug,
    position: body.position,
  });

  return json(category, 201);
};
