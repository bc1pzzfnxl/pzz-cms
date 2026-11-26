import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiError, apiOk, notFoundError } from "../../../../../lib/api";

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing document id.", 400);

  const content = createContent(env.DB);
  if (!(await content.getDocumentById(id))) return notFoundError("Document not found.");

  const body = (await request.json()) as { status?: string };
  if (body.status !== "published" && body.status !== "draft") {
    return apiError("VALIDATION", "status must be 'draft' or 'published'.", 400, {
      issues: [{ path: "status", message: "status must be 'draft' or 'published'." }],
    });
  }

  const document = await content.setDocumentStatus(id, body.status);
  return apiOk({
    id: document.id,
    slug: document.slug,
    status: document.status,
    rev: document.rev,
  });
};
