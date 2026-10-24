import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";
import { renderLlmsTxt } from "@/lib/llms";
import { site } from "@/lib/site";

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  const articles = await content.listPublished();

  return new Response(renderLlmsTxt(site, articles), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
