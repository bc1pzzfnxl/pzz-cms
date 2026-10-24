import { describe, expect, it } from "vitest";
import {
  mediaKeysInHtml,
  mediaObjectKey,
  mediaPublicPath,
  mediaSrcSet,
  mediaVariantKey,
  mediaVariantPath,
  mediaVariantWidths,
  optimizeBodyImages,
} from "@/lib/media";

describe("mediaObjectKey", () => {
  it("builds an ASCII webp key from the file name", () => {
    expect(mediaObjectKey("Mon Image.PNG", "abc123")).toBe("images/mon-image-abc123.webp");
  });

  it("removes accents", () => {
    expect(mediaObjectKey("Forêt d'été.jpg", "x")).toBe("images/foret-dete-x.webp");
  });

  it("falls back to 'image' for an empty name", () => {
    expect(mediaObjectKey("!!!.png", "x")).toBe("images/image-x.webp");
  });
});

describe("mediaPublicPath", () => {
  it("prefixes the key with /media/ and a trailing slash", () => {
    expect(mediaPublicPath("images/a-x.webp")).toBe("/media/images/a-x.webp/");
  });
});

describe("mediaKeysInHtml", () => {
  it("collects the media keys referenced by img tags", () => {
    const html =
      '<p><img src="/media/images/a.webp/" alt="a"/></p><img src="/media/images/b.webp/">';
    expect(mediaKeysInHtml(html)).toEqual(["images/a.webp", "images/b.webp"]);
  });
});

describe("media variants", () => {
  it("builds variant keys and paths", () => {
    expect(mediaVariantKey("images/a-b.webp", 800)).toBe("images/a-b@800.webp");
    expect(mediaVariantPath("images/a-b.webp", 800)).toBe("/media/images/a-b@800.webp/");
  });

  it("only lists variants smaller than the original", () => {
    expect(mediaVariantWidths(1600)).toEqual([480, 800, 1200]);
    expect(mediaVariantWidths(600)).toEqual([480]);
    expect(mediaVariantWidths(400)).toEqual([]);
  });

  it("builds a srcset with the variants and the original", () => {
    expect(mediaSrcSet("images/a-b.webp", 1600)).toBe(
      "/media/images/a-b@480.webp/ 480w, /media/images/a-b@800.webp/ 800w, /media/images/a-b@1200.webp/ 1200w, /media/images/a-b.webp/ 1600w",
    );
    expect(mediaSrcSet("images/a-b.webp", null)).toBeNull();
  });
});

describe("optimizeBodyImages", () => {
  it("adds dimensions and lazy loading", () => {
    const dimensions = new Map([["images/a.webp", { width: 800, height: 600 }]]);
    const html = optimizeBodyImages('<img src="/media/images/a.webp/" alt="a"/>', dimensions);
    expect(html).toContain('width="800"');
    expect(html).toContain('height="600"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('srcset="/media/images/a@480.webp/ 480w, /media/images/a.webp/ 800w"');
    expect(html).toContain('sizes="(max-width: 680px) 100vw, 680px"');
  });

  it("keeps existing attributes and leaves unknown images untouched", () => {
    const html = optimizeBodyImages('<img src="/other/x.png" loading="eager"/>', new Map());
    expect(html).toContain('loading="eager"');
    expect(html).not.toContain("width=");
  });

  it("turns a standalone image into a figure with its alt as caption", () => {
    const html = optimizeBodyImages(
      '<p><img src="/media/images/a.webp/" alt="Une légende"/></p>',
      new Map(),
    );
    expect(html).toContain('<figure class="article-figure">');
    expect(html).toContain('<figcaption class="article-caption">Une légende</figcaption>');
  });

  it("does not caption an image with an empty alt", () => {
    const html = optimizeBodyImages('<p><img src="/media/images/a.webp/" alt=""/></p>', new Map());
    expect(html).not.toContain("figcaption");
  });

  it("does not wrap inline images or images already in a figure", () => {
    const inline = optimizeBodyImages(
      '<p>Texte <img src="/media/images/a.webp/" alt="a"/> suite</p>',
      new Map(),
    );
    const inFigure = optimizeBodyImages(
      '<figure data-figure><img src="/media/images/a.webp/" alt="a"/></figure>',
      new Map(),
    );
    expect(inline).not.toContain("article-figure");
    expect(inFigure).not.toContain("article-figure");
  });
});
