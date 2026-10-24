import type { SiteConfig } from "./site";

export interface LlmsArticle {
  slug: string;
  title: string;
}

/**
 * Build `llms.txt` for AI answer engines. It lists the stable entry points and
 * one line per published article, so it never goes stale when content changes.
 */
export function renderLlmsTxt(site: SiteConfig, articles: LlmsArticle[]): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "## Pages",
    "",
    `- [Home](${site.url}/): article list, newest first.`,
    `- [About](${site.url}/auteur/): author and expertise.`,
    `- [RSS feed](${site.url}/rss.xml)`,
    `- [Sitemap](${site.url}/sitemap-index.xml)`,
    "",
  ];

  if (articles.length > 0) {
    lines.push("## Articles", "");
    for (const article of articles) {
      lines.push(`- [${article.title}](${site.url}/${article.slug}/)`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
