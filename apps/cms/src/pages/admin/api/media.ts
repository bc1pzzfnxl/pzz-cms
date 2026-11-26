import { env } from "cloudflare:workers";
import { createContent, mediaObjectKey, mediaVariantKey } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiError, apiOk, validationError } from "../../../lib/api";

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  const media = await content.listMedia();
  return apiOk(
    media.map((row) => ({
      key: row.r2Key,
      width: row.width,
      height: row.height,
      alt: row.alt,
    })),
  );
};

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const form = await request.formData();

  const file = form.get("file");
  if (!(file instanceof File)) {
    return validationError([{ path: "file", message: "No file was uploaded." }]);
  }
  if (file.type !== "image/webp") {
    return validationError([
      { path: "file", message: "WebP is required (the browser converts before upload)." },
    ]);
  }
  if (file.size > 1024 * 1024) {
    return apiError("VALIDATION", "The image is too large: 1 MB maximum.", 413, {
      issues: [{ path: "file", message: "The image is too large: 1 MB maximum." }],
    });
  }

  const width = Number(form.get("width")) || null;
  const height = Number(form.get("height")) || null;
  const altValue = form.get("alt");
  const alt = typeof altValue === "string" && altValue.trim() ? altValue.trim() : null;

  const key = mediaObjectKey(file.name || "image.webp", crypto.randomUUID().slice(0, 8));
  const bytes = await file.arrayBuffer();
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });

  for (const field of form.keys()) {
    if (!field.startsWith("variant-")) continue;
    const value = form.get(field);
    if (!(value instanceof File) || value.type !== "image/webp") continue;
    const variantWidth = Number(field.slice("variant-".length));
    if (!Number.isFinite(variantWidth) || variantWidth <= 0) continue;
    await env.MEDIA.put(mediaVariantKey(key, variantWidth), await value.arrayBuffer(), {
      httpMetadata: { contentType: "image/webp" },
    });
  }

  const media = await content.createMedia({ r2Key: key, width, height, alt });

  return apiOk(
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
