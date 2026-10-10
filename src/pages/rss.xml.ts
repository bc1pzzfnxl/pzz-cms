import { env } from "cloudflare:workers";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { createContent } from "@/content";
import { site } from "@/lib/site";

export async function GET(context: APIContext) {
  const content = createContent(env.DB);
  const posts = await content.listPublished();

  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      link: `/${post.slug}/`,
      pubDate: post.publishedAt ? new Date(post.publishedAt) : new Date(),
    })),
    customData: `<language>${site.locale}</language>`,
  });
}
