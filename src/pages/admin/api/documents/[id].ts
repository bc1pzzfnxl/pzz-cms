import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface Body {
  title?: string;
  slug?: string;
  description?: string;
  bodyJson?: string;
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
  if (!(await content.getDocumentById(id))) {
    return json({ error: "Document introuvable." }, 404);
  }

  const body = (await request.json()) as Body;
  if (body.bodyJson !== undefined) {
    try {
      JSON.parse(body.bodyJson);
    } catch {
      return json({ error: "Le contenu n'est pas un JSON valide." }, 400);
    }
  }

  const document = await content.updateDocument(id, body);
  return json({ id: document.id, slug: document.slug, status: document.status });
};
