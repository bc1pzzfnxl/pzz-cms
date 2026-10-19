import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return json({ error: "Identifiant manquant." }, 400);

  const content = createContent(env.DB);
  if (!(await content.getDocumentById(id))) {
    return json({ error: "Document introuvable." }, 404);
  }

  const body = (await request.json()) as { status?: string };
  if (body.status !== "published" && body.status !== "draft") {
    return json({ error: "Statut invalide." }, 400);
  }

  const document = await content.setDocumentStatus(id, body.status);
  return json({ id: document.id, slug: document.slug, status: document.status });
};
