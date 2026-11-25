import { describe, expect, it } from "vitest";
import { parseSitemapLocs, pickSitemapPage } from "../../scripts/verify-deploy";

describe("parseSitemapLocs", () => {
  it("extracts every loc URL", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/</loc></url>
<url><loc>https://example.com/article/</loc></url>
</urlset>`;
    expect(parseSitemapLocs(xml)).toEqual(["https://example.com/", "https://example.com/article/"]);
  });
});

describe("pickSitemapPage", () => {
  it("skips the root and picks the first real page", () => {
    const locs = [
      "https://example.com/",
      "https://example.com/rss.xml",
      "https://example.com/first-article/",
      "https://example.com/second-article/",
    ];
    expect(pickSitemapPage(locs, "https://example.com/")).toBe(
      "https://example.com/first-article/",
    );
  });

  it("returns null when the sitemap has only the root", () => {
    expect(pickSitemapPage(["https://example.com/"], "https://example.com/")).toBeNull();
  });
});
