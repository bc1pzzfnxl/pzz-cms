import { env } from "cloudflare:workers";
import { createContent, RevisionConflictError } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import {
  apiError,
  apiOk,
  conflictError,
  notFoundError,
  parseRev,
  validationError,
} from "../../../../lib/api";

interface Body {
  title?: string;
  slug?: string;
  description?: string;
  bodyJson?: string;
  rev?: number;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing document id.", 400);

  const content = createContent(env.DB);
  if (!(await content.getDocumentById(id))) return notFoundError("Document not found.");

  const body = (await request.json()) as Body;
  const rev = parseRev(body.rev);
  if (rev !== undefined && typeof rev !== "number") return validationError([rev]);

  if (body.bodyJson !== undefined) {
    try {
      JSON.parse(body.bodyJson);
    } catch {
      return validationError([{ path: "bodyJson", message: "The content is not valid JSON." }]);
    }
  }

  try {
    const document = await content.updateDocument(
      id,
      {
        title: body.title,
        slug: body.slug,
        description: body.description,
        bodyJson: body.bodyJson,
      },
      rev,
    );
    return apiOk({
      id: document.id,
      slug: document.slug,
      status: document.status,
      rev: document.rev,
    });
  } catch (error) {
    if (error instanceof RevisionConflictError) {
      return conflictError(
        "This document was changed elsewhere. Reload to get the latest version.",
        { rev: error.actual },
      );
    }
    throw error;
  }
};
