import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";
import { mediaObjectKey } from "@/lib/media";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const form = await request.formData();

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Fichier manquant." }, 400);
  }
  if (file.type !== "image/webp") {
    return json({ error: "Format WebP requis (conversion dans le navigateur)." }, 400);
  }
  if (file.size > 1024 * 1024) {
    return json({ error: "Image trop lourde : 1 Mo maximum." }, 413);
  }

  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  const altValue = form.get("alt");
  const alt = typeof altValue === "string" && altValue.trim() ? altValue.trim() : null;

  const key = mediaObjectKey(file.name || "image.webp", crypto.randomUUID().slice(0, 8));
  const bytes = await file.arrayBuffer();
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });

  const media = await content.createMedia({ r2Key: key, width, height, alt });

  return json(
    {
      key: media.r2Key,
      url: `/media/${media.r2Key}`,
      width: media.width,
      height: media.height,
      alt: media.alt,
    },
    201,
  );
};
