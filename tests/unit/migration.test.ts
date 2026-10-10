import { describe, expect, it } from "vitest";
import {
  deriveDescription,
  mediaKeyFromImageUrl,
  parseArticleFile,
  referencedImages,
  rewriteImageUrls,
  slugFromFilename,
  toInsertSql,
} from "@/lib/migration";

const RAW = `---
title: Le Mystère de Barabbas
author: bc1pzzfnxl
date: '2026-07-03T00:00:00.000Z'
dateModified: '2026-09-06'
image: 'https://bc1pzzfnxl.com/images/barabbas.webp'
imageAlt: Ecce Homo
---

## Contexte

Un texte d'introduction assez long pour servir de description par défaut dans le résumé généré automatiquement par la migration.

![Une image](/images/barabbas.webp)
`;

describe("slugFromFilename", () => {
  it("drops the extension", () => {
    expect(slugFromFilename("le-mystere-de-barabbas.md")).toBe("le-mystere-de-barabbas");
  });
});

describe("mediaKeyFromImageUrl", () => {
  it("extracts a media key from an absolute URL", () => {
    expect(mediaKeyFromImageUrl("https://bc1pzzfnxl.com/images/barabbas.webp")).toBe(
      "images/barabbas.webp",
    );
  });

  it("returns null when there is no image", () => {
    expect(mediaKeyFromImageUrl(undefined)).toBeNull();
  });
});

describe("rewriteImageUrls", () => {
  it("rewrites /images/ to the media route with a trailing slash", () => {
    expect(rewriteImageUrls("![x](/images/a.webp)")).toBe("![x](/media/images/a.webp/)");
  });
});

describe("referencedImages", () => {
  it("collects unique media keys", () => {
    expect(referencedImages("a /images/x.webp b /images/x.webp c /images/y.webp")).toEqual([
      "images/x.webp",
      "images/y.webp",
    ]);
  });
});

describe("deriveDescription", () => {
  it("strips markdown and truncates", () => {
    const description = deriveDescription(`# Titre\n\nUn **texte** long.`);
    expect(description).toBe("Titre Un texte long.");
  });

  it("adds an ellipsis past the limit", () => {
    const description = deriveDescription("a".repeat(200), 10);
    expect(description).toBe(`${"a".repeat(10)}…`);
  });
});

describe("parseArticleFile", () => {
  it("maps frontmatter to a published article", () => {
    const { article, images } = parseArticleFile("le-mystere-de-barabbas.md", RAW);

    expect(article.slug).toBe("le-mystere-de-barabbas");
    expect(article.id).toBe("le-mystere-de-barabbas");
    expect(article.title).toBe("Le Mystère de Barabbas");
    expect(article.status).toBe("published");
    expect(article.ogImageKey).toBe("images/barabbas.webp");
    expect(article.publishedAt).toBe("2026-07-03T00:00:00.000Z");
    expect(article.updatedAt).toBe("2026-09-06T00:00:00.000Z");
    expect(article.bodyMdx).toContain("/media/images/barabbas.webp/");
    expect(images).toContain("images/barabbas.webp");
  });
});

describe("toInsertSql", () => {
  it("escapes single quotes and emits inserts without a transaction", () => {
    const { article } = parseArticleFile("x.md", "---\ntitle: L'appel\n---\n\ncorps");
    article.bodyHtml = "<p>corps</p>";
    const sql = toInsertSql([article]);
    expect(sql).toContain("INSERT INTO articles");
    expect(sql).toContain("'L''appel'");
    expect(sql).not.toContain("BEGIN TRANSACTION");
  });
});
