import { describe, expect, it } from "vitest";
import { blogPostingSchema, breadcrumbSchema, personSchema, websiteSchema } from "@/lib/seo";
import { site } from "@/lib/site";

describe("seo schemas", () => {
  it("builds a WebSite schema", () => {
    const schema = websiteSchema(site);
    expect(schema["@type"]).toBe("WebSite");
    expect(schema.url).toBe(site.url);
    expect(schema.inLanguage).toBe(site.locale);
    expect(schema.publisher.logo.url).toBe(site.logo);
  });

  it("builds a BlogPosting schema", () => {
    const schema = blogPostingSchema({
      title: "Le Mystère de Barabbas",
      description: "Résumé.",
      url: "https://bc1pzzfnxl.com/le-mystere-de-barabbas/",
      image: "https://bc1pzzfnxl.com/images/default-cover.webp",
      locale: "fr",
      publishedAt: "2026-01-02T00:00:00Z",
      modifiedAt: "2026-03-04T00:00:00Z",
      author: { name: "bc1pzzfnxl", url: site.url },
      publisher: { name: site.name, url: site.url, logo: site.logo },
    });

    expect(schema["@type"]).toBe("BlogPosting");
    expect(schema.headline).toBe("Le Mystère de Barabbas");
    expect(schema.datePublished).toBe("2026-01-02T00:00:00Z");
    expect(schema.dateModified).toBe("2026-03-04T00:00:00Z");
    expect(schema.mainEntityOfPage["@id"]).toBe(schema.url);
  });

  it("falls back to publishedAt for dateModified", () => {
    const schema = blogPostingSchema({
      title: "T",
      description: "D",
      url: "https://example.com/t/",
      image: "https://example.com/i.webp",
      locale: "fr",
      publishedAt: "2026-01-02T00:00:00Z",
      modifiedAt: null,
      author: { name: "a", url: "https://example.com" },
      publisher: { name: "a", url: "https://example.com", logo: "https://example.com/l.png" },
    });
    expect(schema.dateModified).toBe("2026-01-02T00:00:00Z");
  });

  it("builds a BreadcrumbList with home then article", () => {
    const schema = breadcrumbSchema(site, "Titre", "https://bc1pzzfnxl.com/titre/");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0]).toMatchObject({
      position: 1,
      name: site.name,
      item: site.url,
    });
    expect(schema.itemListElement[1]).toMatchObject({ position: 2, name: "Titre" });
  });

  it("builds a Person schema for the author", () => {
    const schema = personSchema(site);
    expect(schema["@type"]).toBe("Person");
    expect(schema.name).toBe(site.author.name);
    expect(Array.isArray(schema.sameAs)).toBe(true);
  });
});
