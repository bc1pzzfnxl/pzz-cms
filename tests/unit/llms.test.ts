import { describe, expect, it } from "vitest";
import { renderLlmsTxt } from "@/lib/llms";
import type { SiteConfig } from "@/lib/site";

const site: SiteConfig = {
  name: "Example",
  url: "https://example.com",
  description: "A test blog.",
  tagline: "Test",
  locale: "en",
  logo: "https://example.com/logo.png",
  defaultCover: "https://example.com/cover.webp",
  author: {
    name: "Author",
    url: "https://example.com",
    bio: "Bio.",
    sameAs: [],
  },
};

describe("renderLlmsTxt", () => {
  it("lists the stable entry points", () => {
    const txt = renderLlmsTxt(site, []);

    expect(txt).toContain("# Example");
    expect(txt).toContain("https://example.com/sitemap-index.xml");
    expect(txt).not.toContain("## Articles");
  });

  it("lists published articles", () => {
    const txt = renderLlmsTxt(site, [
      { slug: "premier-article", title: "Premier article" },
      { slug: "second-article", title: "Second article" },
    ]);

    expect(txt).toContain("## Articles");
    expect(txt).toContain("- [Premier article](https://example.com/premier-article/)");
    expect(txt).toContain("- [Second article](https://example.com/second-article/)");
  });
});
