import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";

interface Body {
  filename?: string;
  title?: string;
  description?: string;
  bodyJson?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as Body;

  if (!body.filename || !body.bodyJson) {
    return json({ error: "Un fichier JSON est requis." }, 400);
  }
  try {
    JSON.parse(body.bodyJson);
  } catch {
    return json({ error: "Le fichier n'est pas un JSON valide." }, 400);
  }

  const document = await content.createDocument({
    filename: body.filename,
    title: body.title,
    description: body.description,
    bodyJson: body.bodyJson,
  });

  return json({ id: document.id, slug: document.slug }, 201);
};
