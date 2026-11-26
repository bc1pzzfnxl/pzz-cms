import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiError, apiOk, notFoundError, validationError } from "../../../../lib/api";

interface UpdateBody {
  name?: string;
  slug?: string;
  description?: string | null;
  position?: number;
}

export const PUT: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing category id.", 400);

  const content = createContent(env.DB);
  if (!(await content.getCategoryById(id))) return notFoundError("Category not found.");

  const body = (await request.json()) as UpdateBody;
  if (body.name !== undefined && !body.name.trim()) {
    return validationError([{ path: "name", message: "The name is required." }]);
  }

  const category = await content.updateCategory(id, {
    name: body.name?.trim() || undefined,
    slug: body.slug,
    description: body.description,
    position: body.position,
  });

  return apiOk(category);
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return apiError("VALIDATION", "Missing category id.", 400);

  const content = createContent(env.DB);
  if (!(await content.getCategoryById(id))) return notFoundError("Category not found.");

  await content.deleteCategory(id);
  return apiOk({ ok: true });
};
