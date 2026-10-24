import type { APIRoute } from "astro";
import { site } from "@/lib/site";

/** `robots.txt` derived from the site config, so a deployment never ships another site's sitemap URL. */
export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Disallow: /",
    "",
    "User-agent: Google-Extended",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    `Sitemap: ${site.url}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
