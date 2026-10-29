import { env } from "cloudflare:workers";
import { createContent, renderLlmsTxt, site } from "@pzz-cms/core";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  const articles = await content.listPublished();

  return new Response(renderLlmsTxt(site, articles), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
