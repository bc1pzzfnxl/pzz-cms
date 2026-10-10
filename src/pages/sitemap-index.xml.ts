import type { APIRoute } from "astro";
import { absoluteUrl } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * Sitemap index. Kept at this path because the existing blog declares
 * /sitemap-index.xml in robots.txt and in Google Search Console.
 */
export const GET: APIRoute = () => {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <sitemap><loc>${absoluteUrl(site.url, "/sitemap.xml")}</loc></sitemap>`,
    "</sitemapindex>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
