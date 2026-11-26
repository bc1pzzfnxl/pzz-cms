import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiOk, issues, requiredText, validationError } from "../../../../lib/api";

interface CreateBody {
  name?: string;
  slug?: string;
  description?: string | null;
  position?: number;
}

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  return apiOk(await content.listCategories());
};

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as CreateBody;

  const problems = issues(requiredText(body.name, "name", "The name"));
  if (problems.length > 0) return validationError(problems);

  const category = await content.createCategory({
    name: (body.name as string).trim(),
    slug: body.slug,
    description: body.description ?? null,
    position: body.position,
  });

  return apiOk(category, 201);
};
