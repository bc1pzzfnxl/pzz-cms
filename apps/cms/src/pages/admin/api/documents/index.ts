import { env } from "cloudflare:workers";
import { createContent } from "@pzz-cms/core";
import type { APIRoute } from "astro";
import { apiOk, issues, requiredText, validationError } from "../../../../lib/api";

interface Body {
  filename?: string;
  title?: string;
  description?: string;
  bodyJson?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const content = createContent(env.DB);
  const body = (await request.json()) as Body;

  const problems = issues(
    requiredText(body.filename, "filename", "A file name"),
    requiredText(body.bodyJson, "bodyJson", "A JSON body"),
  );
  if (problems.length > 0) return validationError(problems);

  try {
    JSON.parse(body.bodyJson as string);
  } catch {
    return validationError([{ path: "bodyJson", message: "The file is not valid JSON." }]);
  }

  const document = await content.createDocument({
    filename: body.filename as string,
    title: body.title,
    description: body.description,
    bodyJson: body.bodyJson as string,
  });

  return apiOk({ id: document.id, slug: document.slug, rev: document.rev }, 201);
};
