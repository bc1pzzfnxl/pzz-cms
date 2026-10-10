import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { createContent } from "@/content";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/site";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const GET: APIRoute = async () => {
  const content = createContent(env.DB);
  const posts = await content.listPublished();

  const entries = [
    { loc: absoluteUrl(site.url, "/"), lastmod: null as string | null },
    { loc: absoluteUrl(site.url, "/auteur/"), lastmod: null },
    ...posts.map((post) => ({
      loc: absoluteUrl(site.url, `/${post.slug}/`),
      lastmod: post.publishedAt,
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) =>
      entry.lastmod
        ? `  <url><loc>${escapeXml(entry.loc)}</loc><lastmod>${escapeXml(entry.lastmod)}</lastmod></url>`
        : `  <url><loc>${escapeXml(entry.loc)}</loc></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
